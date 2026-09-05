import { defineEventHandler, getQuery, createError } from 'h3'
import { getSnapshotFromCache } from '../../utils/snapshotCache'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const id = String(query.id || '')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: '缺少快照 id'
    })
  }

  const snapshot = getSnapshotFromCache(id)
  if (!snapshot) {
    return {
      success: false,
      snapshot: null,
      message: '未在缓存中找到该快照'
    }
  }

  return {
    success: true,
    snapshot
  }
})
