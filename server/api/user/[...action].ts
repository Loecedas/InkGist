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
      const createdAt = existing ? existing.created_at : (body?.createdAt || new Date().toISOString())

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
      const query = getQuery(event)
      let body: any = null
      const contentType = (event.node?.req?.headers?.['content-type'] || (event.headers?.get ? event.headers.get('content-type') : '') || '') as string
      if (contentType.includes('application/json')) {
        try {
          body = await readBody(event)
        } catch {}
      }
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
      if (folderName.length > 50) throw createError({ statusCode: 400, statusMessage: '分类名称不能超过 50 个字符' })

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
      const query = getQuery(event)
      let body: any = null
      const contentType = (event.node?.req?.headers?.['content-type'] || (event.headers?.get ? event.headers.get('content-type') : '') || '') as string
      if (contentType.includes('application/json')) {
        try {
          body = await readBody(event)
        } catch {}
      }
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
      if (newName.trim().length > 50) {
        throw createError({ statusCode: 400, statusMessage: '新分类名称不能超过 50 个字符' })
      }
      await dbFolders.rename(oldName.trim(), newName.trim(), user.id, event)
      return { success: true, message: '分类文件夹已重命名' }
    }
  }

  // 2.1 分类文件夹重新排序 /api/user/folders/reorder
  if (action === 'folders/reorder') {
    if (method === 'POST' || method === 'PUT') {
      const body = await readBody(event)
      const names = Array.isArray(body) ? body : (body?.folders || body?.names || [])
      if (!Array.isArray(names)) {
        throw createError({ statusCode: 400, statusMessage: '文件夹列表格式错误' })
      }
      const cleanNames = names.map((n: any) => typeof n === 'string' ? n.trim() : (n?.name ? String(n.name).trim() : '')).filter(Boolean)
      await dbFolders.reorder(cleanNames, user.id, event)
      return { success: true, message: '分类排序已保存' }
    }
  }

  // 3. 批量书签操作 /api/user/bookmarks/batch
  if (action === 'bookmarks/batch') {
    if (method === 'POST') {
      const body = await readBody(event)
      const items = Array.isArray(body) ? body : (body?.bookmarks || [])
      if (!Array.isArray(items) || items.length === 0) {
        return { success: true, count: 0, message: '没有需要保存的书签' }
      }

      const rows = items.map((b: any) => ({
        id: b.id || 'bm_' + randomUUID(),
        user_id: user.id,
        title: b.title || b.url,
        url: b.url,
        icon: b.icon || 'bookmark',
        description: b.description || '',
        summary: b.summary || '',
        tags: b.tags || [],
        folder: b.folder || undefined,
        color: b.color || '#0f172a',
        is_pinned: Boolean(b.isPinned || b.is_pinned),
        is_favorite: Boolean(b.isFavorite || b.is_favorite),
        created_at: b.createdAt || b.created_at || new Date().toISOString()
      }))

      const count = await dbBookmarks.batchUpsert(rows, user.id, event)
      return {
        success: true,
        count,
        message: `成功批量导入 ${count} 条书签`
      }
    }
  }

  // 4. 批量分类文件夹操作 /api/user/folders/batch
  if (action === 'folders/batch') {
    if (method === 'POST') {
      const body = await readBody(event)
      const names = Array.isArray(body) ? body : (body?.folders || [])
      if (!Array.isArray(names) || names.length === 0) {
        return { success: true, count: 0, message: '没有需要创建的分类' }
      }

      const now = new Date().toISOString()
      const folderRows = names
        .map((n: any) => typeof n === 'string' ? n.trim() : (n?.name ? String(n.name).trim() : ''))
        .filter((n: string) => n.length > 0 && n.length <= 50)
        .map((name: string) => ({
          id: 'f_' + randomUUID(),
          user_id: user.id,
          name,
          created_at: now
        }))

      const count = await dbFolders.batchInsert(folderRows, user.id, event)
      return {
        success: true,
        count,
        message: `成功批量创建分类`
      }
    }
  }

  throw createError({ statusCode: 404, statusMessage: 'Not Found' })
})
