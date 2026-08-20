-- =============================================================================
-- 墨萃 InkGist - Cloudflare D1 数据库初始化结构 (Schema)
-- 数据库 ID: 429d55ee-7ccd-4808-8176-d2a5943dd6b3
-- =============================================================================

-- 1. 用户表 (Users)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- 2. 文件夹表 (Folders)
CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. 书签表 (Bookmarks)
CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT DEFAULT 'bookmark',
  description TEXT DEFAULT '',
  summary TEXT DEFAULT '',
  tags TEXT DEFAULT '[]',
  folder TEXT,
  color TEXT DEFAULT '#0f172a',
  is_pinned INTEGER DEFAULT 0,
  is_favorite INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. 会话表 (Sessions)
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. 索引优化 (提高查询速度与并发响应)
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_url ON bookmarks(user_id, url);
CREATE INDEX IF NOT EXISTS idx_folders_user ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
