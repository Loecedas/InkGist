import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execSync } from 'node:child_process'

// 1. 先压缩 extension 目录为 zip
const publicDir = path.resolve('public')
const zipPath = path.resolve('public/inkgist-bookmarks-extension.zip')
const crxOutputPath = path.resolve('public/inkgist-bookmarks-assistant.crx')

if (!fs.existsSync(zipPath)) {
  console.error('zip does not exist')
  process.exit(1)
}

const zipBuffer = fs.readFileSync(zipPath)

// 2. 生成 RSA 2048 密钥对（若无私钥）
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'der' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
})

// 3. 构建 CRX2/CRX3 标准数据包
// CRX2 格式规范：
// 0..3: "Cr24" (0x43 0x72 0x32 0x34)
// 4..7: version = 2 (0x02 0x00 0x00 0x00)
// 8..11: pubkey length (little endian 32-bit)
// 12..15: signature length (little endian 32-bit)
// 16.. : public key bytes
// ... : sha1/sha256 signature of zipBuffer
// ... : zipBuffer

const signer = crypto.createSign('SHA1')
signer.update(zipBuffer)
const signature = signer.sign(privateKey)

const crxHeader = Buffer.alloc(16)
crxHeader.write('Cr24', 0, 4, 'ascii') // magic
crxHeader.writeUInt32LE(2, 4) // version 2
crxHeader.writeUInt32LE(publicKey.length, 8) // pubkey length
crxHeader.writeUInt32LE(signature.length, 12) // sig length

const crxBuffer = Buffer.concat([
  crxHeader,
  publicKey,
  signature,
  zipBuffer
])

fs.writeFileSync(crxOutputPath, crxBuffer)

console.log(`✅ CRX 插件打包成功: ${crxOutputPath} (${crxBuffer.length} bytes)`)
