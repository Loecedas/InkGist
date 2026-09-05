import { defineEventHandler, getQuery } from 'h3'

interface VersionResponse {
  currentVersion: string
  latestVersion: string
  hasUpdate: boolean
  releaseNotes: string
  releaseNotesEn?: string
  releaseUrl: string
  publishedAt?: string
  currentCommit?: string
  latestCommit?: string
  isGitRepo: boolean
  branch?: string
  lastCheckedAt: string
}

let cachedResult: VersionResponse | null = null
let lastFetchTime = 0
const CACHE_TTL_MS = 60 * 1000 // 1 分钟缓存

function compareSemver(v1: string, v2: string): number {
  const cleanV1 = v1.replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0)
  const cleanV2 = v2.replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0)

  for (let i = 0; i < Math.max(cleanV1.length, cleanV2.length); i++) {
    const num1 = cleanV1[i] || 0
    const num2 = cleanV2[i] || 0
    if (num1 > num2) return 1
    if (num1 < num2) return -1
  }
  return 0
}

export default defineEventHandler(async (event): Promise<VersionResponse> => {
  const now = Date.now()
  const query = getQuery(event)
  const forceRefresh = query.force === 'true'

  if (!forceRefresh && cachedResult && (now - lastFetchTime < CACHE_TTL_MS)) {
    return cachedResult
  }

  // 1. 读取本地当前项目版本 (动态导入以兼容边缘环境)
  let currentVersion = '1.0.0'
  try {
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      const { readFileSync, existsSync } = await import('node:fs')
      const { resolve } = await import('node:path')
      const pkgPath = resolve(process.cwd(), 'package.json')
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
        if (pkg.version) currentVersion = pkg.version
      }
    }
  } catch {}

  // 2. 检测本地 Git 状态 (动态导入)
  let isGitRepo = false
  let currentCommit = ''
  let branch = 'main'
  try {
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      const { execSync } = await import('node:child_process')
      currentCommit = execSync('git rev-parse --short HEAD', { encoding: 'utf-8', timeout: 3000 }).trim()
      branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8', timeout: 3000 }).trim()
      isGitRepo = true
    }
  } catch {
    isGitRepo = false
  }

  let latestVersion = currentVersion
  let releaseNotes = `# 墨萃 InkGist v1.0.0 正式版

> 墨萃 InkGist — 轻量高颜值 AI 网页智能速读、像素级离线快照与多层级书签管理平台

### ✨ 核心功能与亮点
- **📸 网页全量离线快照**：100% 像素级无损还原原网页图文排版、嵌入样式与字体资产，正文保存在本地 IndexedDB，永不 404。
- **🤖 AI 深度智能速读**：集成 Defuddle 正文提取与 Gemini / DeepSeek / OpenAI / Claude 等多模型，秒级提炼文章摘要与行动要点。
- **📑 现代化书签管理系统**：支持无限层级文件夹、标准 HTML 书签一键导入/导出与多列响应式排布。
- **⚡ 免扩展小书签**：无需安装插件，拖拽即可在任意第三方网页一键抓取快照与快速总结。
- **🔄 系统平滑在线自动更新**：支持网页端一键平滑检测与升级，升级绝不丢失用户数据。`

  let releaseUrl = 'https://github.com/Loecedas/InkGist/releases'
  let publishedAt = new Date().toISOString()
  let hasUpdate = false
  let latestCommit = currentCommit

  // 3. 访问 GitHub 获取远程最新版本与 Release 信息
  try {
    const headers = {
      'User-Agent': 'InkGist-AutoUpdater/1.0',
      'Accept': 'application/vnd.github.v3+json'
    }

    const releaseRes = await fetch('https://api.github.com/repos/Loecedas/InkGist/releases/latest', {
      headers,
      signal: AbortSignal.timeout(6000)
    }).catch(() => null)

    if (releaseRes && releaseRes.ok) {
      const releaseData = await releaseRes.json()
      if (releaseData && releaseData.tag_name) {
        latestVersion = releaseData.tag_name.replace(/^v/i, '')
        if (releaseData.body) {
          releaseNotes = releaseData.body
        }
        releaseUrl = releaseData.html_url || releaseUrl
        publishedAt = releaseData.published_at || publishedAt
        hasUpdate = compareSemver(latestVersion, currentVersion) > 0
      }
    } else {
      const rawPkgRes = await fetch('https://raw.githubusercontent.com/Loecedas/InkGist/main/package.json', {
        headers,
        signal: AbortSignal.timeout(6000)
      }).catch(() => null)

      if (rawPkgRes && rawPkgRes.ok) {
        const remotePkg = await rawPkgRes.json().catch(() => null)
        if (remotePkg && remotePkg.version) {
          latestVersion = remotePkg.version
          if (compareSemver(latestVersion, currentVersion) > 0) {
            hasUpdate = true
          }
        }
      }

      const commitsRes = await fetch('https://api.github.com/repos/Loecedas/InkGist/commits?per_page=5', {
        headers,
        signal: AbortSignal.timeout(6000)
      }).catch(() => null)

      if (commitsRes && commitsRes.ok) {
        const commitsData = await commitsRes.json().catch(() => [])
        if (Array.isArray(commitsData) && commitsData.length > 0) {
          const firstCommit = commitsData[0]
          latestCommit = firstCommit.sha?.substring(0, 7) || latestCommit
          publishedAt = firstCommit.commit?.author?.date || publishedAt

          if (isGitRepo && currentCommit && latestCommit && currentCommit !== latestCommit && !hasUpdate) {
            hasUpdate = true
            latestVersion = `${currentVersion} (${latestCommit})`
          }
        }
      }
    }
  } catch (err: any) {
    console.warn('[AutoUpdater] Failed to fetch remote version from GitHub:', err?.message)
  }

  const result: VersionResponse = {
    currentVersion,
    latestVersion,
    hasUpdate,
    releaseNotes,
    releaseUrl,
    publishedAt,
    currentCommit,
    latestCommit,
    isGitRepo,
    branch,
    lastCheckedAt: new Date().toISOString()
  }

  cachedResult = result
  lastFetchTime = now

  return result
})
