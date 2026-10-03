import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync, createHmac } from 'crypto'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

// 获取数据存储目录
const getDataDir = (): string => {
  let dir = ''
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.DATA_DIR && typeof process.env.DATA_DIR === 'string' && process.env.DATA_DIR.trim()) {
      dir = process.env.DATA_DIR.trim()
    } else if (typeof process.cwd === 'function') {
      dir = join(process.cwd(), 'server', 'data')
    }
  }
  if (!dir) dir = 'data'
  try {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  } catch {}
  return dir
}

// 主密钥生成与持久化保存机制 (确保重启不丢失解密密钥)
let cachedVaultKey: Buffer | null = null
let cachedBlindKey: Buffer | null = null

export const getMasterSecret = (): string => {
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.trim()) {
      return process.env.ENCRYPTION_KEY.trim()
    }
    if (process.env.APP_SECRET && process.env.APP_SECRET.trim()) {
      return process.env.APP_SECRET.trim()
    }
  }
  const dataDir = getDataDir()
  const secretFile = join(dataDir, '.secret')
  try {
    if (existsSync(secretFile)) {
      const saved = readFileSync(secretFile, 'utf-8').trim()
      if (saved && saved.length >= 32) return saved
    }
  } catch {}

  // 首次运行自动生成 64 位强随机主密钥并持久化
  const newSecret = randomBytes(32).toString('hex')
  try {
    writeFileSync(secretFile, newSecret, { encoding: 'utf-8', mode: 0o600 })
  } catch {}
  return newSecret
}

const getVaultKeys = (): { vaultKey: Buffer; blindKey: Buffer } => {
  if (cachedVaultKey && cachedBlindKey) {
    return { vaultKey: cachedVaultKey, blindKey: cachedBlindKey }
  }
  const secret = getMasterSecret()
  // 派生 256 位 AES 强加密密钥
  cachedVaultKey = pbkdf2Sync(secret, 'inkgist_db_vault_salt_2026', 10000, 32, 'sha256')
  // 派生 256 位 HMAC 盲索引检索密钥
  cachedBlindKey = pbkdf2Sync(secret, 'inkgist_db_blind_index_salt_2026', 10000, 32, 'sha256')
  return { vaultKey: cachedVaultKey, blindKey: cachedBlindKey }
}

const CIPHER_PREFIX = 'enc:v1:'

/**
 * 军事级 AES-256-GCM 字段加密
 * 输出格式: enc:v1:<iv_hex>:<tag_hex>:<cipher_hex>
 */
export const encryptField = (plaintext: string | null | undefined): string => {
  if (plaintext === null || plaintext === undefined) return ''
  const str = String(plaintext)
  if (!str) return ''
  if (str.startsWith(CIPHER_PREFIX)) return str // 防止重复加密

  const { vaultKey } = getVaultKeys()
  const iv = randomBytes(12) // GCM 推荐 96 位独立随机 IV
  const cipher = createCipheriv('aes-256-gcm', vaultKey, iv)

  const encrypted = Buffer.concat([cipher.update(str, 'utf-8'), cipher.final()])
  const tag = cipher.getAuthTag() // 128 位防篡改校验认证标签

  return `${CIPHER_PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

/**
 * AES-256-GCM 字段解密 (具备对历史明文数据的无缝自动兼容能力)
 */
export const decryptField = (payload: string | null | undefined): string => {
  if (payload === null || payload === undefined) return ''
  const str = String(payload)
  if (!str) return ''
  if (!str.startsWith(CIPHER_PREFIX)) return str // 兼容未加密明文

  const parts = str.slice(CIPHER_PREFIX.length).split(':')
  if (parts.length !== 3) return str // 格式异常时平滑回退

  const [ivHex, tagHex, cipherHex] = parts
  try {
    const { vaultKey } = getVaultKeys()
    const iv = Buffer.from(ivHex, 'hex')
    const tag = Buffer.from(tagHex, 'hex')
    const decipher = createDecipheriv('aes-256-gcm', vaultKey, iv)
    decipher.setAuthTag(tag)

    const decrypted = Buffer.concat([decipher.update(Buffer.from(cipherHex, 'hex')), decipher.final()])
    return decrypted.toString('utf-8')
  } catch (err) {
    console.warn('AES-256-GCM 解密失败或校验未通过:', err)
    return ''
  }
}

/**
 * 单向 HMAC 盲索引哈希计算 (用于在密文存储下的高效率精确比对与检索，不泄露明文 URL)
 */
export const createBlindIndex = (value: string | null | undefined): string => {
  if (!value) return ''
  const norm = String(value).trim().replace(/\/+$/, '').toLowerCase()
  const { blindKey } = getVaultKeys()
  return createHmac('sha256', blindKey).update(norm).digest('hex')
}
