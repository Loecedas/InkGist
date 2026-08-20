import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const extDir = path.resolve('extension')
const publicDir = path.resolve('public')
const zipPath = path.resolve('public/inkgist-bookmarks-extension.zip')

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true })
}

// 简易 Zip 打包器（支持标准 PKZip 规范）
function createZip(sourceDir, outZipPath) {
  const files = fs.readdirSync(sourceDir)
  const entries = []
  
  for (const filename of files) {
    const fullPath = path.join(sourceDir, filename)
    const stat = fs.statSync(fullPath)
    if (stat.isFile()) {
      const data = fs.readFileSync(fullPath)
      const compressed = zlib.deflateRawSync(data)
      entries.push({
        name: filename,
        data,
        compressed,
        crc: crc32(data),
        size: data.length,
        compSize: compressed.length
      })
    }
  }

  let offset = 0
  const localHeaders = []
  const centralDirHeaders = []

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8')
    
    // Local file header
    const lfh = Buffer.alloc(30 + nameBuf.length)
    lfh.writeUInt32LE(0x04034b50, 0) // signature
    lfh.writeUInt16LE(20, 4) // version needed
    lfh.writeUInt16LE(0, 6) // flags
    lfh.writeUInt16LE(8, 8) // compression: deflate
    lfh.writeUInt16LE(0, 10) // mod time
    lfh.writeUInt16LE(0, 12) // mod date
    lfh.writeUInt32LE(entry.crc, 14) // crc-32
    lfh.writeUInt32LE(entry.compSize, 18) // compressed size
    lfh.writeUInt32LE(entry.size, 22) // uncompressed size
    lfh.writeUInt16LE(nameBuf.length, 26) // filename length
    lfh.writeUInt16LE(0, 28) // extra field length
    nameBuf.copy(lfh, 30)

    const fileBlock = Buffer.concat([lfh, entry.compressed])
    localHeaders.push(fileBlock)

    // Central directory header
    const cdh = Buffer.alloc(46 + nameBuf.length)
    cdh.writeUInt32LE(0x02014b50, 0) // signature
    cdh.writeUInt16LE(20, 4) // version made by
    cdh.writeUInt16LE(20, 6) // version needed
    cdh.writeUInt16LE(0, 8) // flags
    cdh.writeUInt16LE(8, 10) // compression
    cdh.writeUInt16LE(0, 12) // mod time
    cdh.writeUInt16LE(0, 14) // mod date
    cdh.writeUInt32LE(entry.crc, 16) // crc-32
    cdh.writeUInt32LE(entry.compSize, 20) // comp size
    cdh.writeUInt32LE(entry.size, 24) // uncomp size
    cdh.writeUInt16LE(nameBuf.length, 28) // filename length
    cdh.writeUInt16LE(0, 30) // extra field length
    cdh.writeUInt16LE(0, 32) // comment length
    cdh.writeUInt16LE(0, 34) // disk number start
    cdh.writeUInt16LE(0, 36) // internal attrs
    cdh.writeUInt32LE(0, 38) // external attrs
    cdh.writeUInt32LE(offset, 42) // relative offset of local header
    nameBuf.copy(cdh, 46)

    centralDirHeaders.push(cdh)
    offset += fileBlock.length
  }

  const centralDirOffset = offset
  const centralDirSize = centralDirHeaders.reduce((acc, b) => acc + b.length, 0)

  // End of central directory record
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0) // signature
  eocd.writeUInt16LE(0, 4) // disk number
  eocd.writeUInt16LE(0, 6) // disk with central dir
  eocd.writeUInt16LE(entries.length, 8) // num entries on this disk
  eocd.writeUInt16LE(entries.length, 10) // total entries
  eocd.writeUInt32LE(centralDirSize, 12) // central dir size
  eocd.writeUInt32LE(centralDirOffset, 16) // central dir offset
  eocd.writeUInt16LE(0, 20) // comment length

  const finalZip = Buffer.concat([...localHeaders, ...centralDirHeaders, eocd])
  fs.writeFileSync(outZipPath, finalZip)
  console.log(`✅ Zip 打包成功: ${outZipPath} (${finalZip.length} bytes)`)
}

// CRC32 计算
function crc32(buf) {
  let crc = ~0
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (-(crc & 1) & 0xedb88320)
    }
  }
  return (crc ^ ~0) >>> 0
}

createZip(extDir, zipPath)
