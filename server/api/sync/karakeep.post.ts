import { defineEventHandler, readBody, createError } from 'h3'
import { parseBookmarkToKarakeepPayload } from '../../utils/summary-parser'

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const { action = 'sync', bookmarks } = body || {}
  const config = useRuntimeConfig(event)

  // 优先取传参，若未传则读取 runtimeConfig 配置 (Nuxt 自动载入 .env)
  const rawUrl = body?.instanceUrl || config.karakeepInstanceUrl || 'https://cloud.karakeep.app'
  const rawKey = body?.apiKey || config.karakeepApiKey

  if (!rawKey || !String(rawKey).trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: '未检测到 Karakeep API Key，请在项目根目录的 .env 文件中配置 KARAKEEP_API_KEY 后重试！'
    })
  }

  // 1. 标准化 Karakeep 服务端 URL (自动补全 https://，去除 /dashboard、/api 或尾部斜杠)
  let normalizedUrl = String(rawUrl).trim()
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = 'https://' + normalizedUrl
  }
  normalizedUrl = normalizedUrl
    .replace(/\/dashboard.*$/i, '')
    .replace(/\/api.*$/i, '')
    .replace(/\/+$/, '')

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${String(rawKey).trim()}`,
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
