import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, unlinkSync } from 'fs'
import { randomBytes, pbkdf2Sync, randomUUID, createHmac } from 'crypto'
import * as dns from 'dns/promises'
import type { H3Event } from 'h3'
import { getCookie } from 'h3'

// =============================================================================
// 0. API 限流与防刷引擎 (Sliding Window In-Memory Rate Limiter)
// =============================================================================
interface RateLimitRecord {
  timestamps: number[]
}

const rateLimitStore = new Map<string, RateLimitRecord>()

// 每 10 分钟自动清理过期的内存限流记录
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, record] of rateLimitStore.entries()) {
      record.timestamps = record.timestamps.filter(t => now - t < 10 * 60 * 1000)
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key)
      }
    }
  }, 10 * 60 * 1000)
}

export function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now()
  let record = rateLimitStore.get(identifier)
  if (!record) {
    record = { timestamps: [] }
    rateLimitStore.set(identifier, record)
  }

  // 过滤出当前时间窗口内的请求
  record.timestamps = record.timestamps.filter(t => now - t < windowMs)

  if (record.timestamps.length >= limit) {
    const oldest = record.timestamps[0]
    const resetMs = oldest ? windowMs - (now - oldest) : windowMs
    return { allowed: false, remaining: 0, resetMs: Math.max(0, resetMs) }
  }

  record.timestamps.push(now)
  return { allowed: true, remaining: limit - record.timestamps.length, resetMs: windowMs }
}

export function getClientIp(event: H3Event): string {
  try {
    const cfIp = event.node?.req?.headers?.['cf-connecting-ip'] || (event.headers?.get ? event.headers.get('cf-connecting-ip') : null)
    if (typeof cfIp === 'string' && cfIp) return cfIp.trim()
    const forwarded = event.node?.req?.headers?.['x-forwarded-for'] || (event.headers?.get ? event.headers.get('x-forwarded-for') : null)
    if (typeof forwarded === 'string' && forwarded) {
      return forwarded.split(',')[0].trim()
    }
    return event.node?.req?.socket?.remoteAddress || '127.0.0.1'
  } catch {
    return '127.0.0.1'
  }
}

// 统一 API 成功响应包装
export function createApiResponse<T>(data?: T, message = 'success') {
  return {
    success: true,
    code: 200,
    message,
    data: data !== undefined ? data : null
  }
}

// 用户名严格清洗与合法性校验 (防注入、防零宽字符与非法特殊符号)
export function validateUsername(raw: string): { valid: boolean; clean: string; error?: string } {
  if (!raw || typeof raw !== 'string') {
    return { valid: false, clean: '', error: '用户名不能为空' }
  }

  // 移除零宽字符、控制字符与首尾空格
  const clean = raw.replace(/[\u200B-\u200D\uFEFF\u0000-\u001F]/g, '').trim()

  if (clean.length < 2) {
    return { valid: false, clean, error: '用户名长度至少为 2 位' }
  }
  if (clean.length > 20) {
    return { valid: false, clean, error: '用户名长度不能超过 20 位' }
  }

  // 白名单正则：中文字符、英文字母、数字、下划线、短横线与点号
  const validPattern = /^[\u4e00-\u9fa5a-zA-Z0-9_\-\.]+$/
  if (!validPattern.test(clean)) {
    return { valid: false, clean, error: '用户名仅支持中文、字母、数字及下划线/短横线' }
  }

  const reservedNames = ['admin', 'administrator', 'root', 'system', 'null', 'undefined', 'anonymous']
  if (reservedNames.includes(clean.toLowerCase())) {
    return { valid: false, clean, error: '该名称为系统保留用户名，请更换其他名称' }
  }

  return { valid: true, clean }
}

// =============================================================================
// 1. 数据库分表独立持久化 (带写锁队列 + 操作系统级原子重命名写入)
// =============================================================================
let DATA_DIR = ''
try {
  if (typeof process !== 'undefined' && typeof process.cwd === 'function') {
    DATA_DIR = join(process.cwd(), 'server', 'data')
    if (typeof existsSync === 'function' && !existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true })
    }
  }
} catch {}

const USERS_FILE = DATA_DIR ? join(DATA_DIR, 'users.json') : 'users.json'
const BOOKMARKS_FILE = DATA_DIR ? join(DATA_DIR, 'bookmarks.json') : 'bookmarks.json'
const FOLDERS_FILE = DATA_DIR ? join(DATA_DIR, 'folders.json') : 'folders.json'
const SESSIONS_FILE = DATA_DIR ? join(DATA_DIR, 'sessions.json') : 'sessions.json'

const initFile = (filePath: string, defaultData: any) => {
  try {
    if (typeof existsSync === 'function' && !existsSync(filePath)) {
      writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf-8')
    }
  } catch {}
}

if (DATA_DIR) {
  initFile(USERS_FILE, [])
  initFile(BOOKMARKS_FILE, [])
  initFile(FOLDERS_FILE, [])
  initFile(SESSIONS_FILE, [])
}

// 内存与磁盘双重一致性存储引擎
const memoryStore = new Map<string, any>()

const readJson = <T>(filePath: string): T => {
  if (memoryStore.has(filePath)) {
    return JSON.parse(JSON.stringify(memoryStore.get(filePath))) as T
  }
  try {
    if (!existsSync(filePath)) return [] as unknown as T
    const content = readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(content) as T
    memoryStore.set(filePath, parsed)
    return parsed
  } catch (err) {
    console.error(`读取数据文件失败 [${filePath}]:`, err)
    return [] as unknown as T
  }
}

const writeJson = <T>(filePath: string, data: T): void => {
  memoryStore.set(filePath, JSON.parse(JSON.stringify(data)))
  try {
    const tmpFile = `${filePath}.${Date.now()}.${randomUUID().slice(0, 8)}.tmp`
    writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8')
    renameSync(tmpFile, filePath)
  } catch (err) {
    try {
      writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
    } catch (fallbackErr) {
      console.error(`写入文件失败 [${filePath}]:`, fallbackErr)
    }
  }
}

export interface UserRow {
  id: string
  username: string
  password_hash: string
  salt: string
  created_at: string
}

export interface BookmarkRow {
  id: string
  user_id: string
  title: string
  url: string
  icon?: string
  description?: string
  summary?: string
  tags?: string[]
  folder?: string
  color?: string
  is_pinned?: boolean
  is_favorite?: boolean
  created_at: string
}

export interface FolderRow {
  id: string
  user_id: string
  name: string
  created_at: string
}

export interface SessionRow {
  token: string
  user_id: string
  expires_at: number
}

// OWASP 推荐标准迭代次数 (100,000 次) 与向后兼容迭代次数 (1,000 次)
export const OWASP_PBKDF2_ITERATIONS = 100000
export const LEGACY_PBKDF2_ITERATIONS = 1000

export const hashPassword = (password: string, salt?: string, iterations = OWASP_PBKDF2_ITERATIONS) => {
  const finalSalt = salt || randomBytes(16).toString('hex')
  const hash = pbkdf2Sync(password, finalSalt, iterations, 64, 'sha512').toString('hex')
  return { hash, salt: finalSalt, iterations }
}

export const verifyPassword = (password: string, hash: string, salt: string): { valid: boolean; needsRehash?: boolean } => {
  // 1. 优先使用 OWASP 100,000 次标准高强度迭代校验
  const highHash = pbkdf2Sync(password, salt, OWASP_PBKDF2_ITERATIONS, 64, 'sha512').toString('hex')
  if (highHash === hash) {
    return { valid: true, needsRehash: false }
  }

  // 2. 向后兼容旧用户 1,000 次迭代校验 (若匹配成功则标记 needsRehash=true，触发平滑无感升级)
  const legacyHash = pbkdf2Sync(password, salt, LEGACY_PBKDF2_ITERATIONS, 64, 'sha512').toString('hex')
  if (legacyHash === hash) {
    return { valid: true, needsRehash: true }
  }

  return { valid: false }
}

// =============================================================================
// Cloudflare D1 驱动与本地持久化双引擎适配层 (D1 / Local JSON Dual-Engine)
// =============================================================================
export function safeJsonParse<T>(value: any, fallback: T): T {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'object') return value as T
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function getD1Database(event?: H3Event): any {
  if (event?.context?.cloudflare?.env?.DB) return event.context.cloudflare.env.DB
  if (event?.context?.env?.DB) return event.context.env.DB
  if ((event?.context as any)?.cloudflare?.context?.env?.DB) return (event?.context as any).cloudflare.context.env.DB
  if ((event?.context as any)?.DB) return (event?.context as any).DB
  // @ts-ignore
  if (typeof globalThis !== 'undefined' && globalThis.__env__?.DB) return globalThis.__env__.DB
  // @ts-ignore
  if (typeof globalThis !== 'undefined' && globalThis.DB) return globalThis.DB
  // @ts-ignore
  if (typeof DB !== 'undefined') return DB
  return null
}

let d1InitPromise: Promise<void> | null = null
export async function ensureD1Tables(d1: any): Promise<void> {
  if (!d1) return
  if (!d1InitPromise) {
    d1InitPromise = (async () => {
      try {
        await d1.batch([
          d1.prepare(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, salt TEXT NOT NULL, created_at TEXT NOT NULL)`),
          d1.prepare(`CREATE TABLE IF NOT EXISTS folders (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, created_at TEXT NOT NULL)`),
          d1.prepare(`CREATE TABLE IF NOT EXISTS bookmarks (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL, url TEXT NOT NULL, icon TEXT DEFAULT 'bookmark', description TEXT DEFAULT '', summary TEXT DEFAULT '', tags TEXT DEFAULT '[]', folder TEXT, color TEXT DEFAULT '#0f172a', is_pinned INTEGER DEFAULT 0, is_favorite INTEGER DEFAULT 0, created_at TEXT NOT NULL)`),
          d1.prepare(`CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL)`),
          d1.prepare(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`),
          d1.prepare(`CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id)`),
          d1.prepare(`CREATE INDEX IF NOT EXISTS idx_bookmarks_url ON bookmarks(user_id, url)`),
          d1.prepare(`CREATE INDEX IF NOT EXISTS idx_folders_user ON folders(user_id)`),
          d1.prepare(`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`),
          d1.prepare(`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`)
        ])
      } catch (err) {
        d1InitPromise = null
      }
    })()
  }
  return d1InitPromise
}

export const getAppSecret = (): string => {
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.APP_SECRET) return process.env.APP_SECRET
    if (process.env.JWT_SECRET) return process.env.JWT_SECRET
    if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET
  }
  return 'inkgist_auth_secure_key_2026_salt'
}

export const signToken = (payload: string): string => {
  return createHmac('sha256', getAppSecret()).update(payload).digest('hex')
}

export const createSession = async (userId: string, event?: H3Event): Promise<string> => {
  const nonce = randomBytes(16).toString('hex')
  const expiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000 // 365 天超长免登
  const payload = `${nonce}.${userId}.${expiresAt}`
  const signature = signToken(payload)
  const token = `${payload}.${signature}`

  const d1 = getD1Database(event)
  if (d1) {
    await ensureD1Tables(d1)
    await d1.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').bind(token, userId, expiresAt).run()
  } else {
    const sessions = readJson<SessionRow[]>(SESSIONS_FILE)
    sessions.push({ token, user_id: userId, expires_at: expiresAt })
    writeJson(SESSIONS_FILE, sessions)
  }
  return token
}

export const destroySession = async (token: string, event?: H3Event): Promise<void> => {
  if (!token) return
  const d1 = getD1Database(event)
  if (d1) {
    await ensureD1Tables(d1)
    await d1.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
  } else {
    const sessions = readJson<SessionRow[]>(SESSIONS_FILE)
    writeJson(SESSIONS_FILE, sessions.filter(s => s.token !== token))
  }
}

export const getUserBySession = async (token: string, event?: H3Event): Promise<{ id: string; username: string; created_at: string } | null> => {
  if (!token || typeof token !== 'string') return null
  const now = Date.now()
  const d1 = getD1Database(event)

  // 1. 优先查数据库/存储文件中的 Session 记录
  if (d1) {
    await ensureD1Tables(d1)
    const session = await d1.prepare('SELECT * FROM sessions WHERE token = ?').bind(token).first()
    if (session) {
      if (session.expires_at < now) {
        await destroySession(token, event)
        return null
      }
      const user = await d1.prepare('SELECT id, username, created_at FROM users WHERE id = ?').bind(session.user_id).first()
      if (!user) return null
      return { id: String(user.id), username: String(user.username), created_at: String(user.created_at) }
    }
  } else {
    const sessions = readJson<SessionRow[]>(SESSIONS_FILE)
    const session = sessions.find(s => s.token === token)
    if (session) {
      if (session.expires_at < now) {
        await destroySession(token, event)
        return null
      }
      const users = readJson<UserRow[]>(USERS_FILE)
      const user = users.find(u => u.id === session.user_id)
      if (!user) return null
      return { id: user.id, username: user.username, created_at: user.created_at }
    }
  }

  // 2. 无状态签名兜底（即使 sessions.json 重置或 Serverless 冷启动无共享状态，只要签名合法且未过期即可恢复免登态）
  const parts = token.split('.')
  if (parts.length === 4) {
    const [nonce, userId, expiresAtStr, sig] = parts
    const expiresAt = Number(expiresAtStr)
    if (!isNaN(expiresAt) && expiresAt > now) {
      const payload = `${nonce}.${userId}.${expiresAtStr}`
      const expectedSig = signToken(payload)
      if (sig === expectedSig) {
        const user = await dbUsers.findById(userId, event)
        if (user) {
          return { id: user.id, username: user.username, created_at: user.created_at }
        }
      }
    }
  }

  return null
}

export function isRequestSecure(event: H3Event): boolean {
  try {
    if (event.node?.req?.socket && ('encrypted' in event.node.req.socket) && (event.node.req.socket as any).encrypted) {
      return true
    }
    const proto = event.node?.req?.headers?.['x-forwarded-proto'] || (event.headers?.get ? event.headers.get('x-forwarded-proto') : null)
    if (typeof proto === 'string' && proto.toLowerCase().includes('https')) {
      return true
    }
    const ssl = event.node?.req?.headers?.['x-forwarded-ssl'] || (event.headers?.get ? event.headers.get('x-forwarded-ssl') : null)
    if (typeof ssl === 'string' && (ssl.toLowerCase() === 'on' || ssl === '1')) {
      return true
    }
    const scheme = event.node?.req?.headers?.['x-forwarded-scheme'] || (event.headers?.get ? event.headers.get('x-forwarded-scheme') : null)
    if (typeof scheme === 'string' && scheme.toLowerCase() === 'https') {
      return true
    }
    const cfProto = (event.context?.cloudflare?.request?.headers?.get?.('x-forwarded-proto')) || (event.context?.cloudflare?.request?.url?.startsWith('https:'))
    if (cfProto) return true

    return false
  } catch {
    return false
  }
}

export function getAuthCookieOptions(event: H3Event, httpOnly = true) {
  const secure = isRequestSecure(event)
  return {
    httpOnly,
    sameSite: 'lax' as const,
    path: '/',
    secure,
    maxAge: 365 * 24 * 60 * 60 // 365 天长效 Cookie
  }
}

export const getAuthenticatedUser = async (event: H3Event): Promise<{ id: string; username: string; created_at: string } | null> => {
  // 1. HttpOnly session cookie
  let token = getCookie(event, 'auth_session_token')
  // 2. Client token cookie
  if (!token) {
    token = getCookie(event, 'auth_client_token')
  }
  // 3. Raw Cookie header fallback (for cloudflare / proxy edge cases)
  if (!token) {
    const rawCookie = event.node?.req?.headers?.cookie || (event.headers?.get ? event.headers.get('cookie') : null)
    if (typeof rawCookie === 'string') {
      const m1 = rawCookie.match(/(?:^|;\s*)auth_session_token=([^;]+)/)
      if (m1) {
        token = decodeURIComponent(m1[1])
      } else {
        const m2 = rawCookie.match(/(?:^|;\s*)auth_client_token=([^;]+)/)
        if (m2) token = decodeURIComponent(m2[1])
      }
    }
  }
  // 4. Authorization header (Bearer <token>)
  if (!token) {
    const authHeader = event.node?.req?.headers?.authorization || (event.headers?.get ? event.headers.get('authorization') : null)
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim()
    }
  }
  // 5. x-auth-token header
  if (!token) {
    const xAuth = event.node?.req?.headers?.['x-auth-token'] || (event.headers?.get ? event.headers.get('x-auth-token') : null)
    if (typeof xAuth === 'string') {
      token = xAuth.trim()
    }
  }

  if (!token) return null
  return await getUserBySession(token, event)
}

export const dbUsers = {
  findByName: async (username: string, event?: H3Event): Promise<UserRow | null> => {
    const d1 = getD1Database(event)
    if (d1) {
      await ensureD1Tables(d1)
      const res = await d1.prepare('SELECT * FROM users WHERE lower(username) = lower(?)').bind(username.trim()).first()
      return (res as UserRow) || null
    }
    const users = readJson<UserRow[]>(USERS_FILE)
    return users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null
  },
  findById: async (userId: string, event?: H3Event): Promise<UserRow | null> => {
    const d1 = getD1Database(event)
    if (d1) {
      await ensureD1Tables(d1)
      const res = await d1.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first()
      return (res as UserRow) || null
    }
    const users = readJson<UserRow[]>(USERS_FILE)
    return users.find(u => u.id === userId) || null
  },
  insert: async (user: UserRow, event?: H3Event): Promise<void> => {
    const d1 = getD1Database(event)
    if (d1) {
      await ensureD1Tables(d1)
      await d1.prepare('INSERT INTO users (id, username, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)').bind(user.id, user.username, user.password_hash, user.salt, user.created_at).run()
      return
    }
    const users = readJson<UserRow[]>(USERS_FILE)
    users.push(user)
    writeJson(USERS_FILE, users)
  },
  updatePassword: async (userId: string, hash: string, salt: string, event?: H3Event): Promise<void> => {
    const d1 = getD1Database(event)
    if (d1) {
      await ensureD1Tables(d1)
      await d1.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?').bind(hash, salt, userId).run()
      return
    }
    const users = readJson<UserRow[]>(USERS_FILE)
    const target = users.find(u => u.id === userId)
    if (target) {
      target.password_hash = hash
      target.salt = salt
      writeJson(USERS_FILE, users)
    }
  }
}

export const dbBookmarks = {
  findByUser: async (userId: string, event?: H3Event): Promise<BookmarkRow[]> => {
    const d1 = getD1Database(event)
    if (d1) {
      await ensureD1Tables(d1)
      const { results } = await d1.prepare('SELECT * FROM bookmarks WHERE user_id = ? ORDER BY is_pinned DESC, rowid DESC').bind(userId).all()
      return (results || []).map((r: any) => ({
        ...r,
        tags: safeJsonParse<string[]>(r.tags, []),
        is_pinned: Boolean(r.is_pinned),
        is_favorite: Boolean(r.is_favorite)
      }))
    }
    const bookmarks = readJson<BookmarkRow[]>(BOOKMARKS_FILE)
    return bookmarks.filter(b => b.user_id === userId)
  },
  findByUserAndUrl: async (userId: string, url: string, event?: H3Event): Promise<BookmarkRow | null> => {
    const cleanUrl = (url || '').trim()
    const d1 = getD1Database(event)
    if (d1) {
      await ensureD1Tables(d1)
      const res = await d1.prepare('SELECT * FROM bookmarks WHERE user_id = ? AND (url = ? OR lower(url) = lower(?))').bind(userId, cleanUrl, cleanUrl).first()
      if (!res) return null
      return {
        ...res,
        tags: safeJsonParse<string[]>(res.tags, []),
        is_pinned: Boolean(res.is_pinned),
        is_favorite: Boolean(res.is_favorite)
      } as BookmarkRow
    }
    const bookmarks = readJson<BookmarkRow[]>(BOOKMARKS_FILE)
    const norm = (u: string) => (u || '').trim().replace(/\/+$/, '').toLowerCase()
    const targetNorm = norm(cleanUrl)
    return bookmarks.find(b => b.user_id === userId && (b.url === cleanUrl || norm(b.url) === targetNorm)) || null
  },
  upsert: async (bm: BookmarkRow, event?: H3Event): Promise<void> => {
    const d1 = getD1Database(event)
    if (d1) {
      await ensureD1Tables(d1)
      await d1.prepare(`INSERT INTO bookmarks (id, user_id, title, url, icon, description, summary, tags, folder, color, is_pinned, is_favorite, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          url = excluded.url,
          icon = excluded.icon,
          description = excluded.description,
          summary = excluded.summary,
          tags = excluded.tags,
          folder = excluded.folder,
          color = excluded.color,
          is_pinned = excluded.is_pinned,
          is_favorite = excluded.is_favorite`
      ).bind(
        bm.id,
        bm.user_id,
        bm.title,
        bm.url,
        bm.icon || 'bookmark',
        bm.description || '',
        bm.summary || '',
        JSON.stringify(bm.tags || []),
        bm.folder || null,
        bm.color || '#0f172a',
        bm.is_pinned ? 1 : 0,
        bm.is_favorite ? 1 : 0,
        bm.created_at
      ).run()
      return
    }
    const bookmarks = readJson<BookmarkRow[]>(BOOKMARKS_FILE)
    const index = bookmarks.findIndex(b => (b.id === bm.id || (b.url === bm.url && b.user_id === bm.user_id)) && b.user_id === bm.user_id)
    if (index !== -1) bookmarks[index] = bm
    else bookmarks.unshift(bm)
    writeJson(BOOKMARKS_FILE, bookmarks)
  },
  delete: async (id: string, userId: string, event?: H3Event): Promise<boolean> => {
    if (!id || !userId) return false
    const d1 = getD1Database(event)
    if (d1) {
      await ensureD1Tables(d1)
      try {
        const res = await d1.prepare('DELETE FROM bookmarks WHERE id = ? AND user_id = ?').bind(String(id), String(userId)).run()
        return Boolean(res?.meta?.changes && res.meta.changes > 0)
      } catch (err) {
        console.error('D1 delete bookmark error:', err)
        return false
      }
    }
    const bookmarks = readJson<BookmarkRow[]>(BOOKMARKS_FILE)
    const initialLen = bookmarks.length
    const filtered = bookmarks.filter(b => !(b.id === String(id) && b.user_id === String(userId)))
    if (filtered.length !== initialLen) {
      writeJson(BOOKMARKS_FILE, filtered)
      return true
    }
    return false
  },
  deleteByUrl: async (url: string, userId: string, event?: H3Event): Promise<boolean> => {
    if (!url || !userId) return false
    const cleanUrl = (url || '').trim()
    const d1 = getD1Database(event)
    if (d1) {
      await ensureD1Tables(d1)
      try {
        const altUrl = cleanUrl.endsWith('/') ? cleanUrl.slice(0, -1) : cleanUrl + '/'
        const res = await d1.prepare('DELETE FROM bookmarks WHERE user_id = ? AND (url = ? OR url = ? OR lower(url) = lower(?) OR lower(url) = lower(?))').bind(String(userId), cleanUrl, altUrl, cleanUrl, altUrl).run()
        return Boolean(res?.meta?.changes && res.meta.changes > 0)
      } catch (err) {
        console.error('D1 deleteByUrl error:', err)
        return false
      }
    }
    const bookmarks = readJson<BookmarkRow[]>(BOOKMARKS_FILE)
    const norm = (u: string) => (u || '').trim().replace(/\/+$/, '').toLowerCase()
    const targetNorm = norm(cleanUrl)
    const initialLen = bookmarks.length
    const filtered = bookmarks.filter(b => !(b.user_id === String(userId) && (b.url === cleanUrl || norm(b.url) === targetNorm)))
    if (filtered.length !== initialLen) {
      writeJson(BOOKMARKS_FILE, filtered)
      return true
    }
    return false
  }
}

export const dbFolders = {
  findByUser: async (userId: string, event?: H3Event): Promise<FolderRow[]> => {
    const d1 = getD1Database(event)
    if (d1) {
      await ensureD1Tables(d1)
      const { results } = await d1.prepare('SELECT * FROM folders WHERE user_id = ?').bind(userId).all()
      return (results as FolderRow[]) || []
    }
    const folders = readJson<FolderRow[]>(FOLDERS_FILE)
    return folders.filter(f => f.user_id === userId)
  },
  insert: async (folder: FolderRow, event?: H3Event): Promise<void> => {
    const d1 = getD1Database(event)
    if (d1) {
      await ensureD1Tables(d1)
      await d1.prepare('INSERT OR IGNORE INTO folders (id, user_id, name, created_at) VALUES (?, ?, ?, ?)').bind(folder.id, folder.user_id, folder.name, folder.created_at).run()
      return
    }
    const folders = readJson<FolderRow[]>(FOLDERS_FILE)
    if (!folders.some(f => f.user_id === folder.user_id && f.name === folder.name)) {
      folders.push(folder)
      writeJson(FOLDERS_FILE, folders)
    }
  },
  delete: async (name: string, userId: string, event?: H3Event): Promise<void> => {
    const d1 = getD1Database(event)
    if (d1) {
      await ensureD1Tables(d1)
      await d1.batch([
        d1.prepare('DELETE FROM folders WHERE name = ? AND user_id = ?').bind(name, userId),
        d1.prepare('UPDATE bookmarks SET folder = NULL WHERE folder = ? AND user_id = ?').bind(name, userId)
      ])
      return
    }
    const folders = readJson<FolderRow[]>(FOLDERS_FILE)
    writeJson(FOLDERS_FILE, folders.filter(f => !(f.name === name && f.user_id === userId)))
    const bookmarks = readJson<BookmarkRow[]>(BOOKMARKS_FILE)
    let changed = false
    bookmarks.forEach(b => {
      if (b.user_id === userId && b.folder === name) {
        b.folder = undefined
        changed = true
      }
    })
    if (changed) writeJson(BOOKMARKS_FILE, bookmarks)
  },
  rename: async (oldName: string, newName: string, userId: string, event?: H3Event): Promise<void> => {
    const d1 = getD1Database(event)
    if (d1) {
      await ensureD1Tables(d1)
      await d1.batch([
        d1.prepare('UPDATE folders SET name = ? WHERE name = ? AND user_id = ?').bind(newName, oldName, userId),
        d1.prepare('UPDATE bookmarks SET folder = ? WHERE folder = ? AND user_id = ?').bind(newName, oldName, userId)
      ])
      return
    }
    const folders = readJson<FolderRow[]>(FOLDERS_FILE)
    folders.forEach(f => {
      if (f.user_id === userId && f.name === oldName) {
        f.name = newName
      }
    })
    writeJson(FOLDERS_FILE, folders)

    const bookmarks = readJson<BookmarkRow[]>(BOOKMARKS_FILE)
    let changed = false
    bookmarks.forEach(b => {
      if (b.user_id === userId && b.folder === oldName) {
        b.folder = newName
        changed = true
      }
    })
    if (changed) writeJson(BOOKMARKS_FILE, bookmarks)
  }
}

// =============================================================================
// 2. SSRF 安全检测与 DNS 重绑定深度防御引擎
// =============================================================================
export function isPrivateOrRestrictedIp(ip: string): boolean {
  const cleanIp = ip.replace(/^::ffff:/i, '').trim()

  // IPv4 严格范围校验
  const parts = cleanIp.split('.').map(Number)
  if (parts.length === 4 && parts.every(p => !isNaN(p) && p >= 0 && p <= 255)) {
    const [a, b] = parts
    // 0.0.0.0
    if (a === 0) return true
    // 127.0.0.0/8 (环回地址)
    if (a === 127) return true
    // 10.0.0.0/8 (私有 A 类)
    if (a === 10) return true
    // 172.16.0.0/12 (私有 B 类 172.16.0.0 ~ 172.31.255.255)
    if (a === 172 && b >= 16 && b <= 31) return true
    // 192.168.0.0/16 (私有 C 类)
    if (a === 192 && b === 168) return true
    // 169.254.0.0/16 (链路本地 / 云实例元数据服务 169.254.169.254)
    if (a === 169 && b === 254) return true
  }

  // IPv6 严格范围校验
  const lower = cleanIp.toLowerCase()
  if (lower === '::1' || lower === '0:0:0:0:0:0:0:1' || lower === '::') return true
  // Link-Local (fe80::/10)
  if (lower.startsWith('fe80:')) return true

  return false
}

export async function validateAndNormalizeTargetUrl(rawUrl: string): Promise<{ valid: boolean; cleanUrl: string; hostname: string; error?: string }> {
  let cleanUrl = (rawUrl || '').trim()
  if (!cleanUrl) {
    return { valid: false, cleanUrl: '', hostname: '', error: '请输入有效的网址' }
  }

  if (!/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = 'https://' + cleanUrl
  }

  let parsed: URL
  try {
    parsed = new URL(cleanUrl)
  } catch {
    return { valid: false, cleanUrl, hostname: '', error: '网址格式不合法' }
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { valid: false, cleanUrl, hostname: '', error: '安全拦截：仅支持 HTTP 与 HTTPS 协议' }
  }

  const hostname = parsed.hostname.toLowerCase()

  // 1. 静态格式与特殊字符过滤
  if (/^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|::1)$/i.test(hostname) || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    return { valid: false, cleanUrl, hostname, error: '安全拦截：禁止访问本地回环与本地内网地址' }
  }

  if (isPrivateOrRestrictedIp(hostname)) {
    return { valid: false, cleanUrl, hostname, error: '安全拦截：禁止访问私有内网或受限 IP 地址' }
  }

  // 2. DNS 解析深度校验 (防范 DNS Rebinding 攻击)
  try {
    if (dns && typeof dns.lookup === 'function') {
      const addresses = await dns.lookup(hostname, { all: true })
      if (addresses && addresses.length > 0) {
        for (const addr of addresses) {
          if (isPrivateOrRestrictedIp(addr.address)) {
            return {
              valid: false,
              cleanUrl,
              hostname,
              error: `安全拦截：域名被解析为内网或受限 IP (${addr.address})`
            }
          }
        }
      }
    }
  } catch (dnsErr: any) {
    // 若在边缘隔离环境无原生 DNS 解析能力，保持降级容错
  }

  return { valid: true, cleanUrl, hostname }
}

// =============================================================================
// 3. 网页正文抓取与清洗引擎 (原生 DOM 提取 + Jina 备用降级)
// =============================================================================
export interface ScrapedPageResult {
  title: string
  content: string
  description?: string
  siteName?: string
  fetchMethod: 'defuddle' | 'jina' | 'failed'
  antiCrawlDetected: boolean
}

export async function scrapeWebPage(targetUrl: string, jinaApiKey?: string): Promise<ScrapedPageResult> {
  const urlCheck = await validateAndNormalizeTargetUrl(targetUrl)
  if (!urlCheck.valid) {
    throw new Error(urlCheck.error || '无效或受限的网址')
  }

  const normalizedUrl = urlCheck.cleanUrl

  try {
    const res = await fetchWithNativeExtractor(normalizedUrl)
    if (res && res.content.trim().length > 40) {
      return {
        title: res.title || normalizedUrl,
        content: res.content,
        description: res.description,
        siteName: res.siteName,
        fetchMethod: 'defuddle',
        antiCrawlDetected: false
      }
    }
  } catch (err: any) {
    // Native extractor fallback
  }

  try {
    const res = await fetchWithJina(normalizedUrl, jinaApiKey)
    if (res && res.content.trim().length > 30) {
      const antiPatterns = [/just a moment/i, /cloudflare/i, /captcha/i, /access denied/i, /403 forbidden/i]
      const isAnti = antiPatterns.some(p => p.test(res.content.slice(0, 500)))
      return {
        title: res.title || normalizedUrl,
        content: res.content,
        fetchMethod: 'jina',
        antiCrawlDetected: isAnti
      }
    }
  } catch (err: any) {
    // Jina fallback handled
  }

  return { title: normalizedUrl, content: '', fetchMethod: 'failed', antiCrawlDetected: true }
}

async function fetchWithNativeExtractor(url: string) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000) // 8秒熔断
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      }
    })
    clearTimeout(timeoutId)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const html = await response.text()
    if (!html || html.length < 50) throw new Error('Empty HTML')

    // 1. 提取网页标题 (优先 og:title，其次 <title>)
    const ogTitleMatch = html.match(/<meta\s+[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i)
    const titleTagMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    const title = (ogTitleMatch?.[1] || titleTagMatch?.[1] || '').replace(/&[a-z0-9#]+;/gi, ' ').trim()

    // 2. 提取网页描述 (优先 og:description，其次 description)
    const ogDescMatch = html.match(/<meta\s+[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i) ||
                        html.match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i)
    const description = (ogDescMatch?.[1] || '').replace(/&[a-z0-9#]+;/gi, ' ').trim()

    // 3. 提取主体区域 (优先 <article> 或 <main>)
    let targetHtml = html
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
    const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)
    if (articleMatch && articleMatch[1].length > 200) {
      targetHtml = articleMatch[1]
    } else if (mainMatch && mainMatch[1].length > 200) {
      targetHtml = mainMatch[1]
    } else {
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
      if (bodyMatch) targetHtml = bodyMatch[1]
    }

    // 4. 清理所有脚本、样式与无用容器标签
    const cleanText = targetHtml
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, ' ')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n+/g, '\n\n')
      .trim()

    return {
      title,
      content: cleanText.slice(0, 15000),
      description,
      siteName: ''
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

async function fetchWithJina(url: string, apiKey?: string) {
  const jinaUrl = `https://r.jina.ai/${url}`
  const headers: Record<string, string> = { 'Accept': 'application/json', 'X-Return-Format': 'markdown' }
  if (apiKey?.trim()) headers['Authorization'] = `Bearer ${apiKey.trim()}`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒熔断
  try {
    const res = await fetch(jinaUrl, { headers, signal: controller.signal })
    clearTimeout(timeoutId)
    if (!res.ok) throw new Error(`Jina HTTP ${res.status}`)
    const data = await res.json()
    return { title: data?.data?.title || data?.title || '', content: data?.data?.content || data?.content || '' }
  } finally {
    clearTimeout(timeoutId)
  }
}

// =============================================================================
// 4. 多模型统一调度引擎 (智谱 AI / DeepSeek / Gemini)
// =============================================================================
export interface LlmRequestOptions {
  userPromptText: string
  systemPrompt: string
  scrapedContent?: string
}

export interface LlmResponseResult {
  text: string
  providerName: string
  modelName: string
}

export async function callLlmService(
  options: LlmRequestOptions,
  config: {
    zhipuApiKey?: string
    zhipuModel?: string
    deepseekApiKey?: string
    deepseekModel?: string
    geminiApiKey?: string
    geminiModel?: string
    defaultProvider?: string
    aiApiKey?: string
    aiBaseUrl?: string
    aiModel?: string
  }
): Promise<LlmResponseResult | null> {
  const { userPromptText, systemPrompt } = options
  let activeProvider: 'zhipu' | 'deepseek' | 'gemini' | 'custom' | null = null

  if (config.defaultProvider && config.defaultProvider !== 'auto') {
    const p = config.defaultProvider.toLowerCase().trim()
    if (p === 'zhipu' && config.zhipuApiKey) activeProvider = 'zhipu'
    else if (p === 'deepseek' && config.deepseekApiKey) activeProvider = 'deepseek'
    else if (p === 'gemini' && config.geminiApiKey) activeProvider = 'gemini'
  }

  if (!activeProvider) {
    if (config.zhipuApiKey?.trim()) activeProvider = 'zhipu'
    else if (config.deepseekApiKey?.trim()) activeProvider = 'deepseek'
    else if (config.geminiApiKey?.trim()) activeProvider = 'gemini'
    else if (config.aiApiKey?.trim()) activeProvider = 'custom'
  }

  if (!activeProvider) return null

  if (activeProvider === 'zhipu') {
    const apiKey = config.zhipuApiKey?.trim()
    const preferredModel = config.zhipuModel || 'glm-4.6v-flash'
    const candidateModels = [preferredModel, 'glm-4-flash', 'glm-4v-flash'].filter((v, i, a) => a.indexOf(v) === i)
    for (const model of candidateModels) {
      try {
        const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
          method: 'POST',
          signal: AbortSignal.timeout(28000), // 28秒防挂起熔断
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model,
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPromptText }],
            temperature: 0.3,
            max_tokens: 1500
          })
        })
        const data = await response.json()
        const text = data?.choices?.[0]?.message?.content
        if (text?.trim()) return { text: text.trim(), providerName: '智谱 AI', modelName: model }
      } catch (err) {
        console.warn(`智谱模型 [${model}] 异常:`, err)
      }
    }
  }

  if (activeProvider === 'deepseek') {
    const apiKey = config.deepseekApiKey?.trim()
    const model = config.deepseekModel || 'deepseek-chat'
    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        signal: AbortSignal.timeout(28000), // 28秒防挂起熔断
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPromptText }],
          temperature: 0.3,
          max_tokens: 1500
        })
      })
      const data = await response.json()
      const text = data?.choices?.[0]?.message?.content
      if (text?.trim()) return { text: text.trim(), providerName: 'DeepSeek', modelName: model }
    } catch (err) {
      console.warn(`DeepSeek 调用异常:`, err)
    }
  }

  if (activeProvider === 'gemini') {
    const apiKey = config.geminiApiKey?.trim()
    const model = config.geminiModel || 'gemini-2.0-flash'
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
      const response = await fetch(url, {
        method: 'POST',
        signal: AbortSignal.timeout(28000), // 28秒防挂起熔断
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPromptText }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1500 }
        })
      })
      const data = await response.json()
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (text?.trim()) return { text: text.trim(), providerName: 'Google Gemini', modelName: model }
    } catch (err) {
      console.warn(`Gemini 调用异常:`, err)
    }
  }

  return null
}
