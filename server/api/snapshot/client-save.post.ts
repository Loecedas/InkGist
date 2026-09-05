import { defineEventHandler, readBody, createError, setResponseHeaders, getHeader } from 'h3'
import { getClientIp, checkRateLimit } from '../../utils'
import { putSnapshotToCache } from '../../utils/snapshotCache'

/**
 * 客户端小书签 (Bookmarklet) / 浏览器插件一键保存快照专属 API
 * 支持 CORS 跨域 POST 提交，即使目标网页有复杂防爬、登录保护或内网隔离，
 * 只要在浏览器中已渲染呈现，即可 100% 无损归档保存到墨萃。
 */
export default defineEventHandler(async (event) => {
  // 1. 设置跨域 CORS 响应头，允许用户在任意网站点击小书签时提交数据
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-auth-token'
  })

  // 处理 OPTIONS 预检请求
  if (event.node.req.method === 'OPTIONS') {
    return { ok: true }
  }

  try {
    const clientIp = getClientIp(event)
    const rateCheck = checkRateLimit(`snap_client_${clientIp}`, 60, 60 * 1000)
    if (!rateCheck.allowed) {
      throw createError({
        statusCode: 429,
        statusMessage: `快照上传过于频繁，请在 ${Math.ceil(rateCheck.resetMs / 1000)} 秒后再试`
      })
    }

    const body = await readBody(event).catch(() => ({}))
    const {
      url,
      title,
      description,
      siteName,
      coverImage,
      contentHtml,
      wordCount,
      id: customId
    } = body || {}

    if (!url || !title || !contentHtml) {
      throw createError({
        statusCode: 400,
        statusMessage: '缺少必要的快照参数 (url, title, contentHtml)'
      })
    }

    const snapshotId = customId || ('snap_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8))

    const snapshotItem = {
      id: snapshotId,
      url: String(url).trim(),
      title: String(title).trim(),
      description: String(description || '').trim(),
      siteName: String(siteName || '').trim(),
      coverImage: coverImage ? String(coverImage).trim() : '',
      contentHtml: String(contentHtml),
      wordCount: typeof wordCount === 'number' ? wordCount : undefined,
      createdAt: new Date().toISOString()
    }

    // 存入中转缓存，供客户端新标签页直接拉取并存入本地 IndexedDB
    putSnapshotToCache(snapshotItem)

    return {
      success: true,
      id: snapshotId,
      snapshot: snapshotItem,
      message: '快照已成功接收'
    }
  } catch (err: any) {
    if (err?.statusCode) throw err
    throw createError({
      statusCode: 500,
      statusMessage: err?.message || '保存客户端快照失败'
    })
  }
})
