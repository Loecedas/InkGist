import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

// 纯 JS 生成高质量拼图 Emoji 🧩 PNG 图标 (支持 16x16, 48x48, 128x128)
function generatePuzzlePng(size) {
  const width = size
  const height = size
  const rawData = Buffer.alloc(height * (1 + width * 4))

  const cx = width / 2
  const cy = width / 2
  const bodyHalf = width * 0.26
  const knobR = width * 0.13
  const holeR = width * 0.12

  let offset = 0
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0 // Filter type: None
    for (let x = 0; x < width; x++) {
      const dx = x - cx
      const dy = y - cy

      // 1. 基础主体方块
      const inBody = Math.abs(dx) <= bodyHalf && Math.abs(dy) <= bodyHalf

      // 2. 顶部凸起圆形
      const distTopKnob = Math.sqrt(dx * dx + (dy + bodyHalf) * (dy + bodyHalf))
      const inTopKnob = distTopKnob <= knobR

      // 3. 右侧凸起圆形
      const distRightKnob = Math.sqrt((dx - bodyHalf) * (dx - bodyHalf) + dy * dy)
      const inRightKnob = distRightKnob <= knobR

      // 4. 底部凹陷圆形
      const distBottomHole = Math.sqrt(dx * dx + (dy - bodyHalf) * (dy - bodyHalf))
      const inBottomHole = distBottomHole < holeR && dy < bodyHalf

      // 5. 左侧凹陷圆形
      const distLeftHole = Math.sqrt((dx + bodyHalf) * (dx + bodyHalf) + dy * dy)
      const inLeftHole = distLeftHole < holeR && dx > -bodyHalf

      let isInside = (inBody || inTopKnob || inRightKnob) && !inBottomHole && !inLeftHole

      if (isInside) {
        // 经典拼图翠绿 / 翡翠色调 (#10B981 -> #059669) 渐变与立体高光
        const gradientRatio = (y / height) * 0.4
        let rVal = Math.round(16 + gradientRatio * 10)
        let gVal = Math.round(185 - gradientRatio * 40)
        let bVal = Math.round(129 - gradientRatio * 30)
        let aVal = 255

        // 左上角柔和高光
        if (dx < 0 && dy < 0 && (Math.abs(dx) > bodyHalf * 0.6 || Math.abs(dy) > bodyHalf * 0.6)) {
          rVal = Math.min(255, rVal + 40)
          gVal = Math.min(255, gVal + 40)
          bVal = Math.min(255, bVal + 40)
        }

        rawData[offset++] = rVal
        rawData[offset++] = gVal
        rawData[offset++] = bVal
        rawData[offset++] = aVal
      } else {
        rawData[offset++] = 0
        rawData[offset++] = 0
        rawData[offset++] = 0
        rawData[offset++] = 0
      }
    }
  }

  const compressed = zlib.deflateSync(rawData)
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData[8] = 8
  ihdrData[9] = 6
  ihdrData[10] = 0
  ihdrData[11] = 0
  ihdrData[12] = 0
  const ihdrChunk = createChunk('IHDR', ihdrData)
  const idatChunk = createChunk('IDAT', compressed)
  const iendChunk = createChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk])
}

function createChunk(type, data) {
  const len = data.length
  const buf = Buffer.alloc(8 + len + 4)
  buf.writeUInt32BE(len, 0)
  buf.write(type, 4, 4, 'ascii')
  data.copy(buf, 8)
  const crcVal = crc32(buf.subarray(4, 8 + len))
  buf.writeUInt32BE(crcVal, 8 + len)
  return buf
}

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

const extDir = path.resolve('extension')
fs.writeFileSync(path.join(extDir, 'icon16.png'), generatePuzzlePng(16))
fs.writeFileSync(path.join(extDir, 'icon48.png'), generatePuzzlePng(48))
fs.writeFileSync(path.join(extDir, 'icon128.png'), generatePuzzlePng(128))
console.log('✅ 生成拼图 Emoji 🧩 插件高清图标成功 (icon16.png, icon48.png, icon128.png)!')
