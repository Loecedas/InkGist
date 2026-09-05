// 共享轻量快照中转缓存 (支持小书签跨域无缝中转与实时下发，带严格容量上限与 TTL 自动释放)
export interface CachedSnapshot {
  id: string
  url: string
  title: string
  description: string
  siteName: string
  coverImage?: string
  contentHtml: string
  wordCount?: number
  createdAt: string
  expireAt?: number
}

const snapshotMemoryCache = new Map<string, CachedSnapshot>()
const MAX_CACHE = 20 // 严格限制最大 20 条中转缓存 (防范小内存服务器 OOM)
const TTL_MS = 10 * 60 * 1000 // 10 分钟自动过期释放

// 定期垃圾回收
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, item] of snapshotMemoryCache.entries()) {
      if (item.expireAt && item.expireAt < now) {
        snapshotMemoryCache.delete(key)
      }
    }
  }, 2 * 60 * 1000)
}

export const putSnapshotToCache = (snapshot: CachedSnapshot) => {
  const now = Date.now()
  snapshot.expireAt = now + TTL_MS

  // 超出上限时主动淘汰最早的记录
  if (snapshotMemoryCache.size >= MAX_CACHE) {
    const firstKey = snapshotMemoryCache.keys().next().value
    if (firstKey) snapshotMemoryCache.delete(firstKey)
  }
  snapshotMemoryCache.set(snapshot.id, snapshot)
}

export const getSnapshotFromCache = (id: string): CachedSnapshot | null => {
  const item = snapshotMemoryCache.get(id)
  if (!item) return null
  if (item.expireAt && item.expireAt < Date.now()) {
    snapshotMemoryCache.delete(id)
    return null
  }
  return item
}
