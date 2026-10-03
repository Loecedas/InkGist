#!/usr/bin/env node
import { DatabaseSync } from 'node:sqlite'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { pbkdf2Sync, randomBytes } from 'node:crypto'

const rootDir = process.cwd()
const dataDir = process.env.DATA_DIR || join(rootDir, 'server', 'data')
const dbPath = join(dataDir, 'inkgist.db')

if (!existsSync(dbPath)) {
  console.error(`❌ 未找到 SQLite 数据库文件: ${dbPath}`)
  console.log('提示: 请先运行一次开发服务或启动一次墨萃以自动完成数据库初始化与迁移。')
  process.exit(1)
}

const db = new DatabaseSync(dbPath)

const OWASP_PBKDF2_ITERATIONS = 100000

function hashPassword(password, salt = null) {
  const finalSalt = salt || randomBytes(16).toString('hex')
  const hash = pbkdf2Sync(password, finalSalt, OWASP_PBKDF2_ITERATIONS, 64, 'sha512').toString('hex')
  return { hash, salt: finalSalt }
}

const args = process.argv.slice(2)
const command = args[0]

function showHelp() {
  console.log(`
🛡️ 墨萃 (InkGist) 后台用户与安全管理工具

用法:
  node scripts/manage-user.js list                      列出系统内所有注册用户
  node scripts/manage-user.js reset <用户名> <新密码>   重置指定用户的密码并撤销其旧会话
  node scripts/manage-user.js clear <用户名>            清除/重置指定用户密码为安全临时密码
  node scripts/manage-user.js status                    查看数据库存储与全字段加密概况
`)
}

switch (command) {
  case 'list': {
    const users = db.prepare('SELECT id, username, created_at FROM users ORDER BY created_at DESC').all()
    console.log(`\n📋 系统用户列表 (共 ${users.length} 个账号):`)
    console.log('------------------------------------------------------------')
    for (const u of users) {
      console.log(`👤 用户名: ${u.username.padEnd(16)} | ID: ${u.id.padEnd(20)} | 创建时间: ${u.created_at}`)
    }
    console.log('------------------------------------------------------------\n')
    break
  }

  case 'reset': {
    const username = args[1]
    const newPassword = args[2]
    if (!username || !newPassword) {
      console.error('❌ 参数错误: 请提供用户名和新密码。')
      console.log('示例: node scripts/manage-user.js reset admin MyNewSecret123')
      process.exit(1)
    }
    if (newPassword.length < 6) {
      console.error('❌ 密码安全策略要求长度至少为 6 位。')
      process.exit(1)
    }

    const user = db.prepare('SELECT * FROM users WHERE lower(username) = lower(?)').get(username.trim())
    if (!user) {
      console.error(`❌ 未找到用户: "${username}"`)
      process.exit(1)
    }

    const { hash, salt } = hashPassword(newPassword)
    db.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?').run(hash, salt, user.id)
    // 安全策略：同时吊销该用户现有的全部会话，要求重新登录
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id)

    console.log(`\n✅ 用户 [${user.username}] 密码已成功重置！`)
    console.log(`🔒 安全机制: 旧登录会话已全部注销，所有历史加密书签与AI数据不受任何影响，登录即可正常解密查看。\n`)
    break
  }

  case 'clear': {
    const username = args[1]
    if (!username) {
      console.error('❌ 参数错误: 请提供用户名。')
      console.log('示例: node scripts/manage-user.js clear admin')
      process.exit(1)
    }

    const user = db.prepare('SELECT * FROM users WHERE lower(username) = lower(?)').get(username.trim())
    if (!user) {
      console.error(`❌ 未找到用户: "${username}"`)
      process.exit(1)
    }

    // 生成随机 12 位高强度临时密码
    const tempPassword = randomBytes(6).toString('hex')
    const { hash, salt } = hashPassword(tempPassword)

    db.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?').run(hash, salt, user.id)
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id)

    console.log(`\n🧹 用户 [${user.username}] 的旧密码已被后台成功清除！`)
    console.log(`🔑 系统已为其配置高强度临时登录密码:`)
    console.log(`------------------------------------------------------------`)
    console.log(`   账号: ${user.username}`)
    console.log(`   临时密码: ${tempPassword}`)
    console.log(`------------------------------------------------------------`)
    console.log(`💡 提示: 请使用此临时密码登录系统，登录后历史所有加密书签与数据均完好可用。\n`)
    break
  }

  case 'status': {
    const users = db.prepare('SELECT COUNT(*) as count FROM users').get()
    const bookmarks = db.prepare('SELECT COUNT(*) as count FROM bookmarks').get()
    const folders = db.prepare('SELECT COUNT(*) as count FROM folders').get()
    const sessions = db.prepare('SELECT COUNT(*) as count FROM sessions').get()

    console.log('\n📊 墨萃 (InkGist) 数据库存储与加密状态报告:')
    console.log('------------------------------------------------------------')
    console.log(`🗄️ 数据库引擎 : 原生 SQLite (Node.js DatabaseSync)`)
    console.log(`📁 存储路径   : ${dbPath}`)
    console.log(`🔐 加密机制   : AES-256-GCM 全字段加密 (URL、标题、摘要、标签、分类全密文)`)
    console.log(`👥 用户总数   : ${users.count}`)
    console.log(`📑 书签总数   : ${bookmarks.count}`)
    console.log(`📂 分类总数   : ${folders.count}`)
    console.log(`🎫 活跃会话   : ${sessions.count}`)
    console.log('------------------------------------------------------------\n')
    break
  }

  default:
    showHelp()
    break
}
