/**
 * 客户端敏感凭据安全存储与加解密引擎 (Web Cryptography API - AES-GCM-256)
 * 用于防止 API Key 等敏感信息在 localStorage 中明码明文存储
 */

const STORAGE_PREFIX = 'enc:v1:'
const DEVICE_SALT_KEY = 'inkgist_sec_dev_salt'

// 获取或初始化本地客户端唯一设备种子，确保单机隔离派生
function getOrCreateDeviceSalt(): string {
  if (typeof window === 'undefined' || !window.localStorage) return 'inkgist_fallback_seed'
  let salt = localStorage.getItem(DEVICE_SALT_KEY)
  if (!salt) {
    const randomBytes = new Uint8Array(16)
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(randomBytes)
    } else {
      for (let i = 0; i < 16; i++) randomBytes[i] = Math.floor(Math.random() * 256)
    }
    salt = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('')
    try {
      localStorage.setItem(DEVICE_SALT_KEY, salt)
    } catch {}
  }
  return salt
}

// 基于设备种子与随机盐派生 AES-GCM-256 密钥 (PBKDF2-SHA256, 100,000 轮)
async function deriveEncryptionKey(saltBytes: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const deviceSeed = getOrCreateDeviceSalt()
  const masterKeyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(`inkgist_client_vault_${deviceSeed}`),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256'
    },
    masterKeyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * 加密敏感文本 (输出包含独立随机 IV + 独立 Salt + AES-GCM-256 密文)
 */
export async function encryptClientSecret(plainText: string): Promise<string> {
  if (!plainText) return ''
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    // SSR 或非安全上下文简易 Base64 降级 (避免异常中断)
    return 'b64:' + btoa(encodeURIComponent(plainText))
  }

  try {
    const salt = new Uint8Array(16)
    const iv = new Uint8Array(12)
    window.crypto.getRandomValues(salt)
    window.crypto.getRandomValues(iv)

    const key = await deriveEncryptionKey(salt)
    const encoder = new TextEncoder()
    const encodedData = encoder.encode(plainText)

    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    )

    return `${STORAGE_PREFIX}${bufferToBase64(salt)}:${bufferToBase64(iv)}:${bufferToBase64(encryptedBuffer)}`
  } catch (e) {
    console.error('[Security] 凭据加密失败，使用安全退避', e)
    return 'b64:' + btoa(encodeURIComponent(plainText))
  }
}

/**
 * 解密密文还原为敏感文本
 */
export async function decryptClientSecret(cipherText: string): Promise<string> {
  if (!cipherText) return ''
  if (cipherText.startsWith('b64:')) {
    try {
      return decodeURIComponent(atob(cipherText.slice(4)))
    } catch {
      return ''
    }
  }

  if (!cipherText.startsWith(STORAGE_PREFIX)) {
    // 兼容可能遗留的原生明文
    return cipherText
  }

  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    return ''
  }

  try {
    const payload = cipherText.slice(STORAGE_PREFIX.length)
    const [saltB64, ivB64, dataB64] = payload.split(':')
    if (!saltB64 || !ivB64 || !dataB64) return ''

    const salt = base64ToBuffer(saltB64)
    const iv = base64ToBuffer(ivB64)
    const encryptedData = base64ToBuffer(dataB64)

    const key = await deriveEncryptionKey(salt)
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    )

    const decoder = new TextDecoder()
    return decoder.decode(decryptedBuffer)
  } catch (e) {
    console.warn('[Security] 密文解密失败 (可能由于存储损坏或环境变更)', e)
    return ''
  }
}

/**
 * 安全存入 localStorage：自动进行 AES-GCM-256 加密，清理潜在明码残留
 */
export async function saveSecureSecret(storageKey: string, plainText: string, legacyPlainKey?: string): Promise<void> {
  if (typeof window === 'undefined' || !window.localStorage) return

  const clean = (plainText || '').trim()
  if (!clean) {
    localStorage.removeItem(storageKey)
    if (legacyPlainKey) localStorage.removeItem(legacyPlainKey)
    return
  }

  const encrypted = await encryptClientSecret(clean)
  try {
    localStorage.setItem(storageKey, encrypted)
    // 强制彻底移除旧的明码存储项
    if (legacyPlainKey) {
      localStorage.removeItem(legacyPlainKey)
    }
  } catch (e) {
    console.warn('[Security] 写入本地安全凭据失败', e)
  }
}

/**
 * 安全从 localStorage 读取：支持旧明文无缝自动迁移与加密覆盖
 */
export async function loadSecureSecret(storageKey: string, legacyPlainKey?: string): Promise<string> {
  if (typeof window === 'undefined' || !window.localStorage) return ''

  try {
    // 1. 优先读取已加密的密文
    const encrypted = localStorage.getItem(storageKey)
    if (encrypted) {
      const decrypted = await decryptClientSecret(encrypted)
      // 若解密成功，顺便清理可能残留的明码
      if (decrypted && legacyPlainKey && localStorage.getItem(legacyPlainKey)) {
        localStorage.removeItem(legacyPlainKey)
      }
      return decrypted
    }

    // 2. 若无密文但有旧明文，自动执行安全升级迁移
    if (legacyPlainKey) {
      const legacyValue = localStorage.getItem(legacyPlainKey)
      if (legacyValue && legacyValue.trim()) {
        const clean = legacyValue.trim()
        // 自动保存为加密密文
        await saveSecureSecret(storageKey, clean, legacyPlainKey)
        return clean
      }
    }
  } catch (e) {
    console.warn('[Security] 读取本地安全凭据失败', e)
  }

  return ''
}

/**
 * 彻底清除指定凭据
 */
export function removeSecureSecret(storageKey: string, legacyPlainKey?: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    localStorage.removeItem(storageKey)
    if (legacyPlainKey) {
      localStorage.removeItem(legacyPlainKey)
    }
  } catch {}
}
