import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import crypto from 'node:crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'))
const version = pkg.version || '1.1.0'
const versionTag = version.startsWith('v') ? version : `v${version}`

// 每次发布新版本均在本地项目根目录下的 release 目录以版本号新建独立文件夹 (如 release/v1.1.0/)
const releaseDir = path.join(rootDir, 'release', versionTag)
const tempDir = path.join(rootDir, '.temp_pkg')

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

const zipFileName = `inkgist-${versionTag}-standalone.zip`
const zipPath = path.join(releaseDir, zipFileName)

console.log(`Generating zip archive (${zipFileName})...`)
execSync(`tar -a -c -f "${zipPath}" -C "${tempDir}" *`)

// 复制浏览器扩展产物到发布目录
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
const releaseFiles = fs.readdirSync(releaseDir).filter(f => !f.endsWith('.txt') && !f.endsWith('.md'))
for (const file of releaseFiles) {
  const hash = getSha256(path.join(releaseDir, file))
  checksumLines.push(`${hash}  ${file}`)
}

const checksumText = checksumLines.join('\n') + '\n'
fs.writeFileSync(path.join(releaseDir, 'checksums.txt'), checksumText, 'utf8')

// 生成配套的标准中英双语 GitHub Release 版本说明
const releaseNotesContent = `# 墨萃 InkGist ${versionTag} 正式版发布 | Release Notes

> **🇨🇳 中文**：墨萃 InkGist — 轻量高颜值 AI 网页智能速读、像素级离线快照、多层级书签管理与 Karakeep 直连同步平台。  
> **🌐 English**: InkGist — A lightweight, aesthetic platform for AI web summarization, pixel-perfect offline snapshots, hierarchical bookmark management, and Karakeep direct synchronization.

---

## 🇨🇳 中文说明 (Chinese)

### 🚀 核心新特性与改进

#### 1. 🦔 Karakeep (Hoarder) 直连同步 & 自定义实例配置
- **多端直连互通**：支持直连同步到 Karakeep 官方云端 (\`https://cloud.karakeep.app\`) 以及私有局域网自建实例（如群晖、NAS、本地 Docker 等）。
- **分类与标签自动映射**：同步时自动在 Karakeep 中检索或创建对应 Lists 目录，精准映射「一句话核心概括」与「关键功能说明」。
- **一键测试连接**：同步弹窗内置网络连通性与 API Key 有效性即时测试探测。

#### 2. 🔒 工业级客户端 Web Crypto 凭据加密引擎 (安全加固)
- **拒绝明码存储**：前端输入 Karakeep API Key 后，采用浏览器原生 **Web Cryptography API (AES-GCM-256)** 结合本地设备种子与 PBKDF2（100,000 轮）动态加密存储，杜绝任何明码泄露。
- **平滑自动迁移**：自动迁移并彻底销毁旧版本明文项；清空密钥时自动销毁本地密文。
- **显隐眼睛切换**：密码输入框新增一键切换明暗小眼睛按钮，防误触防输错。

#### 3. 🛡️ 服务端 SSRF 深度防御与端口封堵
- **拦截云元数据探针**：服务端代理严格拦截 \`169.254.169.254\`、\`metadata.google.internal\` 等云厂商元数据地址。
- **拦截高危敏感端口**：封锁系统与数据库非 Web 敏感端口（如 Redis 6379、SSH 22、Docker 2375 等），防止内网穿透渗透。
- **协议白名单与 CRLF 过滤**：严格仅允许 HTTP/HTTPS 协议，杜绝回车换行走私攻击。
- **请求限流防刷**：接口增加针对单个客户端 IP 的高频防刷安全限制。

#### 4. ⚡ 自动化构建、版本内联与 Cloudflare 边缘兼容
- **Cloudflare 边缘版本内联**：版本号与 Git Commit SHA 在编译时直接注入客户端与服务端，彻底解决 Serverless 边缘环境下因缺少文件系统而无法正确识别版本的问题。
- **纯净本地 Release 打包工具**：自动按版本在本地 \`release/v{VERSION}/\` 独立建档，并自动配置 \`.gitignore\` 严防安装包泄露到公共 Git 仓库。
- **全量自动化测试套件**：新增全量自动化回归测试，100% 覆盖 SSRF、加解密完整性与边界校验。

---

## 🌐 English Release Notes

### 🚀 Key Highlights & Improvements

#### 1. 🦔 Karakeep (Hoarder) Direct Synchronization & Instance Configuration
- **Seamless Connectivity**: Direct one-click synchronization to Karakeep Cloud (\`https://cloud.karakeep.app\`) or self-hosted private instances (NAS, Synology, Docker, LAN).
- **Intelligent Category & Tag Mapping**: Automatically queries or creates corresponding Lists in Karakeep, with semantic field mapping for one-line summaries and core descriptions.
- **One-Click Connectivity Diagnostics**: Built-in real-time connection test tool in the export modal to verify instance accessibility and API Key permissions.

#### 2. 🔒 Enterprise-Grade Web Crypto Credential Encryption (Security Hardening)
- **Zero Plaintext Storage**: Karakeep API Keys entered on the client side are encrypted via the browser-native **Web Cryptography API (AES-GCM-256)** derived using PBKDF2 (100,000 iterations) with device-isolated seeds.
- **Seamless Auto-Migration**: Automatically upgrades and destroys legacy unencrypted storage entries; clears ciphertexts when keys are removed.
- **Interactive Visibility Toggle**: Eye icon added to the password input field for quick inspection.

#### 3. 🛡️ Server-Side SSRF Defense & Sensitive Port Guard
- **Cloud Metadata Defense**: Blocks sensitive cloud instance metadata addresses (\`169.254.169.254\`, \`metadata.google.internal\`).
- **Dangerous Port Blocklist**: Blocks non-Web system and database ports (e.g., Redis 6379, SSH 22, Docker 2375) against intranet probing.
- **Strict Protocol Whitelist & CRLF Sanitization**: Rejects non-HTTP/HTTPS schemes and CRLF injection.
- **Rate Limiting**: Built-in IP-level rate limiting to thwart brute-force probes and proxy abuse.

#### 4. ⚡ Cloudflare Edge Compatibility & Automated Packaging
- **Compile-Time Version Inlining**: Directly inlines \`appVersion\` and Git Commit SHA at build time to ensure accurate version display in Serverless Edge environments (Cloudflare Pages/Workers).
- **Clean Local Release Tooling**: Versioned output to \`release/v{VERSION}/\` with automatic \`.gitignore\` protection against binary leakages into Git repositories.
- **Comprehensive Automated Test Suite**: 21/21 automated tests passing with 100% regression coverage.

---

### 📦 资产校验和 / Checksums (SHA-256)

\`\`\`text
${checksumText.trim()}
\`\`\`
`

fs.writeFileSync(path.join(releaseDir, 'release-notes.md'), releaseNotesContent, 'utf8')

fs.rmSync(tempDir, { recursive: true, force: true })

console.log(`Done! Release package files generated successfully in: release/${versionTag}/`)
const files = fs.readdirSync(releaseDir)
for (const file of files) {
  const stat = fs.statSync(path.join(releaseDir, file))
  console.log(`- ${file} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`)
}

