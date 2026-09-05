import { defineEventHandler, readBody, sendRedirect, createError } from 'h3'
import { putSnapshotToCache } from '../../utils/snapshotCache'

/**
 * 客户端小书签免 CSP 拦截的表单 POST 归档接口
 * 采用 Form POST + 302 自动重定向机制，100% 免疫原网页 CSP connect-src / CORS 限制
 */
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event).catch(() => ({}))
    const {
      id,
      url,
      title,
      description,
      siteName,
      coverImage,
      contentHtml,
      wordCount
    } = body || {}

    const snapshotId = id || ('snap_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8))
    const finalUrl = url ? String(url).trim() : 'https://unknown'
    const finalTitle = title ? String(title).trim() : '未命名快照'
    const finalHtml = contentHtml ? String(contentHtml) : '<p>无图文内容</p>'

    const snapshotItem = {
      id: snapshotId,
      url: finalUrl,
      title: finalTitle,
      description: description ? String(description).trim() : '',
      siteName: siteName ? String(siteName).trim() : '',
      coverImage: coverImage ? String(coverImage).trim() : '',
      contentHtml: finalHtml,
      wordCount: wordCount ? Number(wordCount) : undefined,
      createdAt: new Date().toISOString()
    }

    // 存入中转缓存，供新标签页加载并持久化存入 IndexedDB
    putSnapshotToCache(snapshotItem)

    const isJson = event.node.req.headers['content-type']?.includes('application/json') || event.node.req.headers['accept']?.includes('application/json')
    if (isJson) {
      return { success: true, id: snapshotId }
    }

    // 表单提交直接 302 重定向到专属离线快照页面
    return sendRedirect(event, `/snapshot/${snapshotId}`, 302)
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      statusMessage: err?.message || '表单保存快照失败'
    })
  }
})
