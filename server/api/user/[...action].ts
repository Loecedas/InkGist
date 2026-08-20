import { defineEventHandler, readBody, getQuery, createError, getRouterParam } from 'h3'
import { dbBookmarks, dbFolders, getAuthenticatedUser } from '../../utils'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: '未登录或登录态已失效' })
  }

  const action = getRouterParam(event, 'action')
  const method = (event.method || event.node?.req?.method || 'GET').toUpperCase()

  // 1. 书签操作 /api/user/bookmarks
  if (action === 'bookmarks') {
    if (method === 'GET') {
      const rows = await dbBookmarks.findByUser(user.id, event)
      return {
        success: true,
        bookmarks: rows.map(r => ({
          id: r.id,
          title: r.title,
          url: r.url,
          icon: r.icon || 'bookmark',
          description: r.description,
          summary: r.summary,
          tags: r.tags || [],
          folder: r.folder || undefined,
          color: r.color || '#0f172a',
          isPinned: Boolean(r.is_pinned),
          isFavorite: Boolean(r.is_favorite),
          createdAt: r.created_at
        }))
      }
    }

    if (method === 'POST') {
      const body = await readBody(event)
      const { id, title, url, icon, description, summary, tags, folder, color, isPinned, isFavorite } = body || {}
      if (!url || !title) throw createError({ statusCode: 400, statusMessage: '标题和网址不能为空' })

      const existing = await dbBookmarks.findByUserAndUrl(user.id, url, event)
      const isUpdate = Boolean(existing)
      const bookmarkId = existing ? existing.id : (id || 'bm_' + randomUUID())
      const createdAt = existing ? existing.created_at : new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })

      await dbBookmarks.upsert({
        id: bookmarkId,
        user_id: user.id,
        title,
        url,
        icon: icon || 'bookmark',
        description: description || '',
        summary: summary || '',
        tags: tags || [],
        folder: folder || (existing ? existing.folder : undefined),
        color: color || '#0f172a',
        is_pinned: Boolean(isPinned),
        is_favorite: Boolean(isFavorite),
        created_at: createdAt
      }, event)
      return {
        success: true,
        isUpdate,
        message: isUpdate ? '已更新该网址的原有书签与总结' : '书签保存成功',
        id: bookmarkId
      }
    }

    if (method === 'DELETE') {
      // 同时兼容 Query 参数 (?id=xxx&url=yyy) 与 JSON Body ({ id: xxx, url: yyy })
      const query = getQuery(event)
      const body = await readBody(event).catch(() => null)
      const targetId = (query?.id as string) || body?.id
      const targetUrl = (query?.url as string) || body?.url
      if (!targetId && !targetUrl) throw createError({ statusCode: 400, statusMessage: '缺少书签 ID 或网址' })
      
      let deleted = false
      if (targetId) {
        deleted = await dbBookmarks.delete(String(targetId), user.id, event)
      }
      if (!deleted && targetUrl) {
        deleted = await dbBookmarks.deleteByUrl(String(targetUrl), user.id, event)
      }
      return { success: true, message: '书签已删除', deleted }
    }
  }

  // 2. 分类文件夹操作 /api/user/folders
  if (action === 'folders') {
    if (method === 'GET') {
      const folders = await dbFolders.findByUser(user.id, event)
      return {
        success: true,
        folders
      }
    }

    if (method === 'POST') {
      const body = await readBody(event)
      if (!body?.name?.trim()) throw createError({ statusCode: 400, statusMessage: '分类名称不能为空' })
      const folderName = body.name.trim()
      if (folderName.length > 20) throw createError({ statusCode: 400, statusMessage: '分类名称不能超过 20 个字符' })

      const folderId = 'f_' + randomUUID()
      const createdAt = new Date().toISOString()
      await dbFolders.insert({ id: folderId, user_id: user.id, name: folderName, created_at: createdAt }, event)
      return {
        success: true,
        message: '分类创建成功',
        folder: { id: folderId, name: folderName, created_at: createdAt }
      }
    }

    if (method === 'DELETE') {
      // 同时兼容 Query 参数 (?name=xxx) 与 JSON Body ({ name: xxx })
      const query = getQuery(event)
      const body = await readBody(event).catch(() => null)
      const targetName = (query?.name as string) || body?.name
      if (!targetName) throw createError({ statusCode: 400, statusMessage: '缺少分类名称' })
      await dbFolders.delete(String(targetName), user.id, event)
      return { success: true, message: '分类文件夹已删除' }
    }

    if (method === 'PUT') {
      const body = await readBody(event)
      const { oldName, newName } = body || {}
      if (!oldName?.trim() || !newName?.trim()) {
        throw createError({ statusCode: 400, statusMessage: '原文件夹名称与新名称不能为空' })
      }
      if (newName.trim().length > 20) {
        throw createError({ statusCode: 400, statusMessage: '新分类名称不能超过 20 个字符' })
      }
      await dbFolders.rename(oldName.trim(), newName.trim(), user.id, event)
      return { success: true, message: '分类文件夹已重命名' }
    }
  }

  throw createError({ statusCode: 404, statusMessage: 'Not Found' })
})
