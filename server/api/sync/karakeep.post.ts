import { defineEventHandler, readBody, createError } from 'h3'
import { parseBookmarkToKarakeepPayload } from '../../utils/summary-parser'
import { checkRateLimit, getClientIp, getAuthenticatedUser } from '../../utils'

// 高危/非 Web 系统端口黑名单 (防止 SSRF 扫描内部基础设施)
const DANGEROUS_PORTS = new Set([
  21, 22, 23, 25, 53, 69, 110, 111, 135, 137, 138, 139, 143, 389, 445,
  1433, 1521, 2049, 2375, 2376, 3306, 5432, 5900, 6379, 9200, 11211, 27017
])

// 受限元数据主机 (防止云服务器元数据泄露)
const RESTRICTED_HOSTS = new Set([
  '169.254.169.254',
  'metadata.google.internal',
  '100.100.100.200',
  '0.0.0.0',
  '::'
])

function sanitizeAndValidateKarakeepUrl(rawUrl: string): { valid: boolean; normalizedUrl: string; error?: string } {
  let clean = (rawUrl || '').trim()
  if (!clean) {
    return { valid: false, normalizedUrl: '', error: '请输入有效的 Karakeep 实例地址' }
  }

  // CRLF 注入防护：禁止包含换行符或不可见控制字符
  if (/[\r\n\x00-\x1F\x7F]/.test(clean)) {
    return { valid: false, normalizedUrl: '', error: '实例地址包含非法字符' }
  }

  // 检查是否包含协议头；若包含非 HTTP/HTTPS 协议则直接拦截
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(clean)) {
    if (!/^https?:\/\//i.test(clean)) {
      return { valid: false, normalizedUrl: '', error: '仅支持 HTTP 或 HTTPS 协议' }
    }
  } else {
    clean = 'https://' + clean
  }

  let parsed: URL
  try {
    parsed = new URL(clean)
  } catch {
    return { valid: false, normalizedUrl: '', error: '实例地址格式不合法' }
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, normalizedUrl: '', error: '仅支持 HTTP 或 HTTPS 协议' }
  }

  const hostname = parsed.hostname.toLowerCase().trim()
  if (!hostname || RESTRICTED_HOSTS.has(hostname) || hostname.endsWith('.internal')) {
    return { valid: false, normalizedUrl: '', error: '禁止访问受限的主机或云元数据服务' }
  }

  if (parsed.port) {
    const portNum = parseInt(parsed.port, 10)
    if (DANGEROUS_PORTS.has(portNum)) {
      return { valid: false, normalizedUrl: '', error: `端口 ${portNum} 为受限服务端口，禁止连接` }
    }
  }

  let normalized = `${parsed.protocol}//${parsed.host}${parsed.pathname}`
    .replace(/\/dashboard.*$/i, '')
    .replace(/\/api.*$/i, '')
    .replace(/\/+$/, '')

  return { valid: true, normalizedUrl: normalized }
}

export default defineEventHandler(async (event) => {
  // 1. 请求频率安全限流 (按 IP 限流，防止暴力探针或代理滥用)
  const clientIp = getClientIp(event)
  const rateCheck = checkRateLimit(`karakeep_${clientIp}`, 120, 60 * 1000)
  if (!rateCheck.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: `Karakeep 请求过于频繁，请在 ${Math.ceil(rateCheck.resetMs / 1000)} 秒后再试`
    })
  }

  const body = await readBody(event).catch(() => ({}))
  const { action = 'sync', bookmarks } = body || {}
  const config = useRuntimeConfig(event)

  // 优先取传参，若未传则读取 runtimeConfig 配置 (Nuxt 自动载入 .env)
  const rawUrl = body?.instanceUrl || config.karakeepInstanceUrl || 'https://cloud.karakeep.app'
  const rawKey = body?.apiKey || config.karakeepApiKey

  if (!rawKey || typeof rawKey !== 'string' || !rawKey.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: '未检测到有效的 Karakeep API Key，请配置后重试！'
    })
  }

  // 2. SSRF 安全校验与标准化 Karakeep 服务端 URL
  const urlValidation = sanitizeAndValidateKarakeepUrl(String(rawUrl))
  if (!urlValidation.valid) {
    throw createError({
      statusCode: 400,
      statusMessage: urlValidation.error || '无效的 Karakeep 实例地址'
    })
  }
  const normalizedUrl = urlValidation.normalizedUrl

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${rawKey.trim()}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }

  // 2. 测试连接
  if (action === 'test') {
    try {
      // 尝试访问 /api/v1/lists 或 /api/v1/bookmarks 测试连通性
      const resp = await fetch(`${normalizedUrl}/api/v1/lists`, {
        method: 'GET',
        headers
      })

      if (!resp.ok) {
        let errDetail = resp.statusText
        try {
          const errJson = await resp.json()
          errDetail = errJson.message || errJson.error || errDetail
        } catch {}
        return {
          success: false,
          error: `Karakeep 鉴权/响应错误 (${resp.status}): ${errDetail}`
        }
      }

      return {
        success: true,
        message: '连接成功！Karakeep 实例在线且 API Key 有效。'
      }
    } catch (e: any) {
      return {
        success: false,
        error: `无法连接到 Karakeep 服务 (${normalizedUrl}): ${e.message || '网络连接失败，请检查地址是否正确'}`
      }
    }
  }

  // 3. 执行书签直连同步
  if (action === 'sync') {
    if (!Array.isArray(bookmarks) || bookmarks.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: '未提供待同步的书签数据'
      })
    }

    // 3.1 获取或创建分类 Lists
    const listMap = new Map<string, string>() // folderName -> listId
    try {
      const listsResp = await fetch(`${normalizedUrl}/api/v1/lists`, { method: 'GET', headers })
      if (listsResp.ok) {
        const listsData = await listsResp.json()
        const listsArr = Array.isArray(listsData) ? listsData : (listsData.lists || listsData.items || [])
        for (const l of listsArr) {
          if (l.name && l.id) {
            listMap.set(l.name.trim().toLowerCase(), l.id)
            listMap.set(l.name.trim(), l.id)
          }
        }
      }
    } catch {}

    const neededFolders = new Set<string>()
    for (const bm of bookmarks) {
      if (bm.folder && bm.folder !== 'all') {
        neededFolders.add(bm.folder.trim())
      }
    }

    for (const folder of neededFolders) {
      if (!listMap.has(folder) && !listMap.has(folder.toLowerCase())) {
        try {
          const createListResp = await fetch(`${normalizedUrl}/api/v1/lists`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ name: folder })
          })
          if (createListResp.ok) {
            const newList = await createListResp.json()
            const lid = newList?.id || newList?.list?.id
            if (lid) {
              listMap.set(folder, lid)
              listMap.set(folder.toLowerCase(), lid)
            }
          }
        } catch {}
      }
    }

    // 3.2 逐条推送书签，兼容 Karakeep link 创建规范
    let successCount = 0
    const errors: Array<{ title: string; error: string }> = []

    for (const bm of bookmarks) {
      try {
        const meta = parseBookmarkToKarakeepPayload(bm)
        const matchedListId = meta.folder ? (listMap.get(meta.folder) || listMap.get(meta.folder.toLowerCase())) : undefined

        // 构造标准合法 payload (避免任何未被 Karakeep Zod Schema 识别的字段)
        const createPayload: Record<string, any> = {
          type: 'link',
          url: meta.url
        }

        if (meta.title) createPayload.title = meta.title
        if (meta.oneLiner) createPayload.note = meta.oneLiner       // 描述填入一句话概括
        if (meta.coreFeatures) createPayload.summary = meta.coreFeatures // 概括填入核心功能说明

        let createResp = await fetch(`${normalizedUrl}/api/v1/bookmarks`, {
          method: 'POST',
          headers,
          body: JSON.stringify(createPayload)
        })

        // 若基础传参出现模式校验错误，进行极简降级重试 (仅传 type 与 url)
        if (!createResp.ok && createResp.status === 400) {
          createResp = await fetch(`${normalizedUrl}/api/v1/bookmarks`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ type: 'link', url: meta.url })
          })
        }

        if (createResp.ok) {
          successCount++
          const createdData = await createResp.json().catch(() => null)
          const bmId = createdData?.id || createdData?.bookmark?.id

          if (bmId) {
            // 补充更新标题、笔记与概括字段
            try {
              await fetch(`${normalizedUrl}/api/v1/bookmarks/${bmId}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({
                  title: meta.title,
                  note: meta.oneLiner,
                  summary: meta.coreFeatures
                })
              })
            } catch {}

            // 将书签归入对应的 List 分类
            if (matchedListId) {
              try {
                await fetch(`${normalizedUrl}/api/v1/lists/${matchedListId}/bookmarks/${bmId}`, {
                  method: 'PUT',
                  headers
                })
              } catch {
                try {
                  await fetch(`${normalizedUrl}/api/v1/lists/${matchedListId}/bookmarks/${bmId}`, {
                    method: 'POST',
                    headers
                  })
                } catch {}
              }
            }

            // 补充关联标签
            if (meta.tags && meta.tags.length > 0) {
              try {
                await fetch(`${normalizedUrl}/api/v1/bookmarks/${bmId}/tags`, {
                  method: 'POST',
                  headers,
                  body: JSON.stringify({
                    tags: meta.tags.map(t => ({ name: t }))
                  })
                })
              } catch {}
            }
          }
        } else {
          let errText = `${createResp.status} ${createResp.statusText}`
          try {
            const ej = await createResp.json()
            errText = ej.message || ej.error || JSON.stringify(ej) || errText
          } catch {}
          errors.push({ title: meta.title, error: errText })
        }
      } catch (e: any) {
        errors.push({ title: bm.title || bm.url, error: e.message || '网络请求错误' })
      }
    }

    if (successCount === 0 && errors.length > 0) {
      return {
        success: false,
        total: bookmarks.length,
        syncedCount: 0,
        failedCount: errors.length,
        error: errors[0]?.error || '书签未能成功导入 Karakeep，请检查 API Key 权限或网址是否可访问',
        errors
      }
    }

    return {
      success: true,
      total: bookmarks.length,
      syncedCount: successCount,
      failedCount: errors.length,
      errors: errors.slice(0, 10)
    }
  }

  throw createError({
    statusCode: 400,
    statusMessage: '未知的操作类型'
  })
})
