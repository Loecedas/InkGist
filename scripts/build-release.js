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

const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'))
const version = pkg.version || '1.1.0'

const zipFileName = `inkgist-v${version}-standalone.zip`
const tarFileName = `inkgist-v${version}-standalone.tar.gz`
const zipPath = path.join(releaseDir, zipFileName)
const tarPath = path.join(releaseDir, tarFileName)

console.log(`Generating tar.gz archive (${tarFileName})...`)
execSync(`tar -czf "${tarPath}" -C "${tempDir}" .`)

console.log(`Generating zip archive (${zipFileName})...`)
execSync(`tar -a -c -f "${zipPath}" -C "${tempDir}" *`)

// 复制浏览器扩展产物到 release 发布目录
const extZipSource = path.join(rootDir, 'public', 'inkgist-bookmarks-extension.zip')
const extCrxSource = path.join(rootDir, 'public', 'inkgist-bookmarks-assistant.crx')
if (fs.existsSync(extZipSource)) {
  fs.copyFileSync(extZipSource, path.join(releaseDir, 'inkgist-bookmarks-extension.zip'))
}
if (fs.existsSync(extCrxSource)) {
  fs.copyFileSync(extCrxSource, path.join(releaseDir, 'inkgist-bookmarks-assistant.crx'))
}

function getSha256(filePath) {
  const data = fs.readFileSync(filePath)
  return crypto.createHash('sha256').update(data).digest('hex')
}

const checksumLines = []
const releaseFiles = fs.readdirSync(releaseDir).filter(f => !f.endsWith('.txt'))
for (const file of releaseFiles) {
  const hash = getSha256(path.join(releaseDir, file))
  checksumLines.push(`${hash}  ${file}`)
}

const checksumText = checksumLines.join('\n') + '\n'
fs.writeFileSync(path.join(releaseDir, '校验和.txt'), checksumText, 'utf8')
fs.writeFileSync(path.join(releaseDir, 'checksums.txt'), checksumText, 'utf8')

fs.rmSync(tempDir, { recursive: true, force: true })

console.log('Done! Release package files generated successfully:')
const files = fs.readdirSync(releaseDir)
for (const file of files) {
  const stat = fs.statSync(path.join(releaseDir, file))
  console.log(`- ${file} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`)
}
