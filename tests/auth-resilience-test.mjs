import assert from 'node:assert/strict'
import {
  createSession,
  getUserBySession,
  getAuthenticatedUser,
  dbUsers,
  isRequestSecure,
  getAuthCookieOptions,
  signToken
} from '../server/utils/index.ts'

async function runAuthResilienceTests() {
  console.log('🛡️ 开始执行鉴权持久化与全场景韧性测试 (Auth Resilience Test Suite)...\n')

  // 1. 创建测试用户
  const testUserId = 'u_verify_' + Date.now()
  const testUser = {
    id: testUserId,
    username: 'verify_user_' + Date.now(),
    password_hash: 'mock_hash',
    salt: 'mock_salt',
    created_at: new Date().toISOString()
  }
  await dbUsers.insert(testUser)

  // 2. 生成 365 天防丢失签名 Token
  const token = await createSession(testUserId)
  console.log('  1. Token 生成测试: 成功生成四段式签名 Token')
  assert.ok(token)
  assert.equal(token.split('.').length, 4)

  // 3. 测试数据库/内存中有 Session 记录时的鉴权
  const user1 = await getUserBySession(token)
  console.log('  2. 常规 Session 读取测试: 成功匹配用户')
  assert.equal(user1?.id, testUserId)

  // 4. 模拟 Serverless 冷启动 / 临时文件清空 / 服务重启（即模拟 DB 中 Session 丢失）
  const fakeToken = `${token.split('.')[0]}.${testUserId}.${Date.now() + 1000000}.${signToken(`${token.split('.')[0]}.${testUserId}.${Date.now() + 1000000}`)}`
  const userRecovered = await getUserBySession(fakeToken)
  console.log('  3. 无状态冷启动/缓存丢失容灾测试: 通过 HMAC 签名成功兜底恢复用户态')
  assert.equal(userRecovered?.id, testUserId)

  // 5. 模拟 Token 被篡改或伪造
  const tamperedToken = `${fakeToken.slice(0, -4)}abcd`
  const userTampered = await getUserBySession(tamperedToken)
  console.log('  4. Token 防篡改安全测试: 篡改签名被成功拒绝')
  assert.equal(userTampered, null)

  // 6. 模拟 Token 过期
  const expiredToken = `nonce.${testUserId}.${Date.now() - 10000}.${signToken(`nonce.${testUserId}.${Date.now() - 10000}`)}`
  const userExpired = await getUserBySession(expiredToken)
  console.log('  5. Token 过期安全测试: 过期凭证被成功拦截')
  assert.equal(userExpired, null)

  // 7. 测试多源请求头与 Cookie 鉴权解析 (getAuthenticatedUser)
  // 7.1 HttpOnly Cookie
  const event1 = { node: { req: { headers: { cookie: `auth_session_token=${token}` } } } }
  assert.equal((await getAuthenticatedUser(event1))?.id, testUserId)
  console.log('  6. 多源鉴权测试 1/4: HttpOnly Cookie 解析通过')

  // 7.2 客户端 Cookie
  const event2 = { node: { req: { headers: { cookie: `auth_client_token=${token}` } } } }
  assert.equal((await getAuthenticatedUser(event2))?.id, testUserId)
  console.log('  7. 多源鉴权测试 2/4: Client Cookie 解析通过')

  // 7.3 Authorization: Bearer
  const event3 = { node: { req: { headers: { authorization: `Bearer ${token}` } } } }
  assert.equal((await getAuthenticatedUser(event3))?.id, testUserId)
  console.log('  8. 多源鉴权测试 3/4: Authorization: Bearer 头解析通过')

  // 7.4 x-auth-token
  const event4 = { node: { req: { headers: { 'x-auth-token': token } } } }
  assert.equal((await getAuthenticatedUser(event4))?.id, testUserId)
  console.log('  9. 多源鉴权测试 4/4: x-auth-token 头解析通过')

  // 8. 测试 HTTP / HTTPS Cookie 安全属性精准适配
  const httpEvent = { node: { req: { headers: { host: '192.168.0.10:3000' } } } }
  assert.equal(isRequestSecure(httpEvent), false)
  assert.equal(getAuthCookieOptions(httpEvent).secure, false)
  console.log('  10. HTTP 局域网/自建环境 Cookie 标志测试: secure=false (浏览器不会丢弃)')

  const httpsEvent = { node: { req: { headers: { 'x-forwarded-proto': 'https' } } } }
  assert.equal(isRequestSecure(httpsEvent), true)
  assert.equal(getAuthCookieOptions(httpsEvent).secure, true)
  console.log('  11. HTTPS 生产/反代环境 Cookie 标志测试: secure=true (合规加密传输)')

  console.log('\n========================================')
  console.log('🎉 鉴权全链路 11 项韧性测试全部通过！')
  console.log('========================================\n')
}

runAuthResilienceTests().catch(err => {
  console.error('测试失败:', err)
  process.exit(1)
})
