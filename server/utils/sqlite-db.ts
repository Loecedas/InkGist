import { DatabaseSync } from 'node:sqlite'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, renameSync } from 'fs'
import { encryptField, createBlindIndex } from './db-crypto.ts'

let dbInstance: DatabaseSync | null = null

const getDataDir = (): string => {
  let dir = ''
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.DATA_DIR && typeof process.env.DATA_DIR === 'string' && process.env.DATA_DIR.trim()) {
      dir = process.env.DATA_DIR.trim()
    } else if (typeof process.cwd === 'function') {
      dir = join(process.cwd(), 'server', 'data')
    }
  }
  if (!dir) dir = 'data'
  try {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  } catch {}
  return dir
}

export const getSqliteDb = (): DatabaseSync => {
  if (dbInstance) return dbInstance

  const dataDir = getDataDir()
  const dbPath = join(dataDir, 'inkgist.db')

  const db = new DatabaseSync(dbPath)
  // 开启高性能 WAL (Write-Ahead Logging) 模式与标准同步
  try {
    db.exec('PRAGMA journal_mode = WAL;')
    db.exec('PRAGMA synchronous = NORMAL;')
  } catch {}

  // 初始化所有数据表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      url_hash TEXT,
      icon TEXT DEFAULT '',
      description TEXT DEFAULT '',
      summary TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      folder TEXT,
      color TEXT DEFAULT '#0f172a',
      is_pinned INTEGER DEFAULT 0,
      is_favorite INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
    CREATE INDEX IF NOT EXISTS idx_bookmarks_url_hash ON bookmarks(user_id, url_hash);
    CREATE INDEX IF NOT EXISTS idx_folders_user ON folders(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  `)

  // 动态字段增补容错 (升级现有数据库)
  try {
    db.exec('ALTER TABLE bookmarks ADD COLUMN url_hash TEXT;')
  } catch {}

  // 历史明文 JSON 数据自动加密迁移入库
  migrateJsonFilesToSqlite(db, dataDir)

  dbInstance = db
  return db
}

/**
 * 历史 JSON 平滑自动迁移：读取旧明文 JSON 文件，执行 AES-256-GCM 全字段加密入库，并将原文件安全备份重命名
 */
function migrateJsonFilesToSqlite(db: DatabaseSync, dataDir: string) {
  try {
    const usersFile = join(dataDir, 'users.json')
    const foldersFile = join(dataDir, 'folders.json')
    const bookmarksFile = join(dataDir, 'bookmarks.json')
    const sessionsFile = join(dataDir, 'sessions.json')

    // 检查是否已有数据
    const userCount = (db.prepare('SELECT COUNT(*) as cnt FROM users').get() as any)?.cnt || 0

    // 1. 迁移用户表
    if (existsSync(usersFile) && userCount === 0) {
      try {
        const users = JSON.parse(readFileSync(usersFile, 'utf-8'))
        if (Array.isArray(users) && users.length > 0) {
          const insertStmt = db.prepare('INSERT OR IGNORE INTO users (id, username, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)')
          for (const u of users) {
            insertStmt.run(u.id, u.username, u.password_hash, u.salt, u.created_at || new Date().toISOString())
          }
        }
        renameSync(usersFile, `${usersFile}.migrated.bak`)
      } catch (err) {
        console.warn('迁移 users.json 遇到警告:', err)
      }
    }

    // 2. 迁移文件夹表 (加密分类名称)
    const folderCount = (db.prepare('SELECT COUNT(*) as cnt FROM folders').get() as any)?.cnt || 0
    if (existsSync(foldersFile) && folderCount === 0) {
      try {
        const folders = JSON.parse(readFileSync(foldersFile, 'utf-8'))
        if (Array.isArray(folders) && folders.length > 0) {
          const insertStmt = db.prepare('INSERT OR IGNORE INTO folders (id, user_id, name, created_at) VALUES (?, ?, ?, ?)')
          for (const f of folders) {
            // 加密存储文件夹名
            insertStmt.run(f.id, f.user_id, encryptField(f.name), f.created_at || new Date().toISOString())
          }
        }
        renameSync(foldersFile, `${foldersFile}.migrated.bak`)
      } catch (err) {
        console.warn('迁移 folders.json 遇到警告:', err)
      }
    }

    // 3. 迁移书签表 (全字段加密处理)
    const bookmarkCount = (db.prepare('SELECT COUNT(*) as cnt FROM bookmarks').get() as any)?.cnt || 0
    if (existsSync(bookmarksFile) && bookmarkCount === 0) {
      try {
        const bookmarks = JSON.parse(readFileSync(bookmarksFile, 'utf-8'))
        if (Array.isArray(bookmarks) && bookmarks.length > 0) {
          const insertStmt = db.prepare(`
            INSERT OR REPLACE INTO bookmarks 
            (id, user_id, title, url, url_hash, icon, description, summary, tags, folder, color, is_pinned, is_favorite, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
          for (const bm of bookmarks) {
            const rawUrl = bm.url || ''
            const tagsStr = Array.isArray(bm.tags) ? JSON.stringify(bm.tags) : (typeof bm.tags === 'string' ? bm.tags : '[]')
            insertStmt.run(
              bm.id,
              bm.user_id,
              encryptField(bm.title || ''),
              encryptField(rawUrl),
              createBlindIndex(rawUrl),
              encryptField(bm.icon || ''),
              encryptField(bm.description || ''),
              encryptField(bm.summary || ''),
              encryptField(tagsStr),
              bm.folder ? encryptField(bm.folder) : null,
              bm.color || '#0f172a',
              bm.is_pinned ? 1 : 0,
              bm.is_favorite ? 1 : 0,
              bm.created_at || new Date().toISOString()
            )
          }
        }
        renameSync(bookmarksFile, `${bookmarksFile}.migrated.bak`)
      } catch (err) {
        console.warn('迁移 bookmarks.json 遇到警告:', err)
      }
    }

    // 4. 迁移会话表
    const sessionCount = (db.prepare('SELECT COUNT(*) as cnt FROM sessions').get() as any)?.cnt || 0
    if (existsSync(sessionsFile) && sessionCount === 0) {
      try {
        const sessions = JSON.parse(readFileSync(sessionsFile, 'utf-8'))
        if (Array.isArray(sessions) && sessions.length > 0) {
          const insertStmt = db.prepare('INSERT OR IGNORE INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
          for (const s of sessions) {
            insertStmt.run(s.token, s.user_id, s.expires_at)
          }
        }
        renameSync(sessionsFile, `${sessionsFile}.migrated.bak`)
      } catch (err) {
        console.warn('迁移 sessions.json 遇到警告:', err)
      }
    }
  } catch (err) {
    console.error('自动数据库数据迁移异常:', err)
  }
}
