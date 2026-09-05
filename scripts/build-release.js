import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import crypto from 'node:crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const rootDir = path.resolve(__dirname, '..')
const releaseDir = path.join(rootDir, 'dist', 'release')
const tempDir = path.join(rootDir, 'dist', 'temp_pkg')

if (fs.existsSync(releaseDir)) fs.rmSync(releaseDir, { recursive: true, force: true })
if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true })

fs.mkdirSync(releaseDir, { recursive: true })
fs.mkdirSync(tempDir, { recursive: true })

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return
  const stat = fs.statSync(src)
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true })
    for (const file of fs.readdirSync(src)) {
      copyRecursive(path.join(src, file), path.join(dest, file))
    }
  } else {
    fs.copyFileSync(src, dest)
  }
}

console.log('Copying production files to package staging...')
copyRecursive(path.join(rootDir, '.output'), path.join(tempDir, '.output'))
copyRecursive(path.join(rootDir, 'package.json'), path.join(tempDir, 'package.json'))
copyRecursive(path.join(rootDir, 'README.md'), path.join(tempDir, 'README.md'))
if (fs.existsSync(path.join(rootDir, 'LICENSE'))) {
  copyRecursive(path.join(rootDir, 'LICENSE'), path.join(tempDir, 'LICENSE'))
}

const zipPath = path.join(releaseDir, 'inkgist-v1.0.0-standalone.zip')
const tarPath = path.join(releaseDir, 'inkgist-v1.0.0-standalone.tar.gz')

console.log('Generating tar.gz archive...')
execSync(`tar -czf "${tarPath}" -C "${tempDir}" .`)

console.log('Generating zip archive...')
execSync(`tar -a -c -f "${zipPath}" -C "${tempDir}" *`)

function getSha256(filePath) {
  const data = fs.readFileSync(filePath)
  return crypto.createHash('sha256').update(data).digest('hex')
}

const zipSha = getSha256(zipPath)
const tarSha = getSha256(tarPath)

const checksumText = `${zipSha}  inkgist-v1.0.0-standalone.zip\n${tarSha}  inkgist-v1.0.0-standalone.tar.gz\n`

fs.writeFileSync(path.join(releaseDir, '校验和.txt'), checksumText, 'utf8')
fs.writeFileSync(path.join(releaseDir, 'checksums.txt'), checksumText, 'utf8')

fs.rmSync(tempDir, { recursive: true, force: true })

console.log('Done! Release package files generated successfully:')
const files = fs.readdirSync(releaseDir)
for (const file of files) {
  const stat = fs.statSync(path.join(releaseDir, file))
  console.log(`- ${file} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`)
}
