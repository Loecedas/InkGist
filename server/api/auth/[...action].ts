import { defineEventHandler, readBody, createError, setCookie, deleteCookie, getCookie, getRouterParam } from 'h3'
import {
  dbUsers,
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  getAuthenticatedUser,
  checkRateLimit,
  getClientIp,
  validateUsername,
  getAuthCookieOptions
} from '../../utils'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const action = getRouterParam(event, 'action')
  const method = event.node.req.method
  const clientIp = getClientIp(event)

  // 1. 获取当前登录状态 GET /api/auth/user
  if (action === 'user' && method === 'GET') {
    const user = await getAuthenticatedUser(event)
    const token = getCookie(event, 'auth_session_token') || getCookie(event, 'auth_client_token')
    return {
      success: true,
      user: user || null,
      token: user && token ? token : undefined
    }
  }

  // 2. 用户登录 POST /api/auth/login
  if (action === 'login' && method === 'POST') {
    // 防暴力碰撞限流：每个 IP 5 分钟内最多尝试 10 次
    const rateCheck = checkRateLimit(`login_${clientIp}`, 10, 5 * 60 * 1000)
    if (!rateCheck.allowed) {
      throw createError({
        statusCode: 429,
        statusMessage: `登录尝试次数过多，请在 ${Math.ceil(rateCheck.resetMs / 1000)} 秒后再试`
      })
    }

    const { username, password } = (await readBody(event)) || {}
    if (!username || !password) {
      throw createError({ statusCode: 400, statusMessage: '请输入用户名和密码' })
    }

    const userCheck = validateUsername(String(username))
    if (!userCheck.valid) {
      throw createError({ statusCode: 400, statusMessage: userCheck.error || '用户名格式不正确' })
    }

    const cleanUsername = userCheck.clean
    const user = await dbUsers.findByName(cleanUsername, event)
    if (!user) {
      throw createError({ statusCode: 401, statusMessage: '用户名不存在，请检查或先注册' })
    }

    const { valid, needsRehash } = verifyPassword(String(password), user.password_hash, user.salt)
    if (!valid) {
      throw createError({ statusCode: 401, statusMessage: '密码错误，请重新输入' })
    }

    // 若旧用户使用旧版 1000 次哈希，在登录成功时自动平滑升级为 100,000 次 OWASP 标准哈希
    if (needsRehash) {
      const { hash: newHash, salt: newSalt } = hashPassword(String(password))
      await dbUsers.updatePassword(user.id, newHash, newSalt, event)
    }

    const token = await createSession(user.id, event)
    
    // 双轨 Cookie 持久化：HttpOnly 保护 + 客户端可用，根据真实请求环境智能配置 secure
    setCookie(event, 'auth_session_token', token, getAuthCookieOptions(event, true))
    setCookie(event, 'auth_client_token', token, getAuthCookieOptions(event, false))

    return {
      success: true,
      message: '登录成功',
      user: { id: user.id, username: user.username, createdAt: user.created_at },
      token
    }
  }

  // 3. 用户注册 POST /api/auth/register
  if (action === 'register' && method === 'POST') {
    // 注册防刷限流：每个 IP 10 分钟内最多注册 5 个账号
    const rateCheck = checkRateLimit(`register_${clientIp}`, 5, 10 * 60 * 1000)
    if (!rateCheck.allowed) {
      throw createError({
        statusCode: 429,
        statusMessage: `注册请求过于频繁，请在 ${Math.ceil(rateCheck.resetMs / 1000)} 秒后再试`
      })
    }

    const { username, password } = (await readBody(event)) || {}
    const userCheck = validateUsername(String(username || ''))
    if (!userCheck.valid) {
      throw createError({ statusCode: 400, statusMessage: userCheck.error || '用户名不合法' })
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      throw createError({ statusCode: 400, statusMessage: '密码长度至少为 6 位' })
    }
    if (password.length > 50) {
      throw createError({ statusCode: 400, statusMessage: '密码长度不能超过 50 位' })
    }

    const cleanUsername = userCheck.clean
    const existing = await dbUsers.findByName(cleanUsername, event)
    if (existing) {
      throw createError({ statusCode: 409, statusMessage: '该用户名已被注册，请直接登录' })
    }

    const userId = 'u_' + randomUUID()
    const { hash, salt } = hashPassword(password) // 采用 100,000 次 OWASP 标准迭代
    const createdAt = new Date().toISOString()

    await dbUsers.insert({ id: userId, username: cleanUsername, password_hash: hash, salt, created_at: createdAt }, event)

    const token = await createSession(userId, event)
    
    // 双轨 Cookie 持久化
    setCookie(event, 'auth_session_token', token, getAuthCookieOptions(event, true))
    setCookie(event, 'auth_client_token', token, getAuthCookieOptions(event, false))

    return {
      success: true,
      message: '注册成功',
      user: { id: userId, username: cleanUsername, createdAt },
      token
    }
  }

  // 4. 退出登录 POST /api/auth/logout
  if (action === 'logout' && method === 'POST') {
    const token = event.node?.req?.headers?.cookie?.match(/auth_session_token=([^;]+)/)?.[1] ||
      getCookie(event, 'auth_session_token') ||
      getCookie(event, 'auth_client_token')
    if (token) await destroySession(token, event)
    deleteCookie(event, 'auth_session_token', { path: '/' })
    deleteCookie(event, 'auth_client_token', { path: '/' })
    return { success: true, message: '已安全退出登录' }
  }

  throw createError({ statusCode: 404, statusMessage: 'Not Found' })
})
