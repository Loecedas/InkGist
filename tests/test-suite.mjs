import assert from 'node:assert/strict'
import {
  validateAndNormalizeTargetUrl,
  checkRateLimit,
  validateUsername,
  hashPassword,
  verifyPassword
} from '../server/utils/index.ts'

async function runAllTests() {
  console.log('🚀 正在运行自动化测试套件 (Automated Test Suite)...\n')
  let passed = 0
  let failed = 0

  function test(name, fn) {
    try {
      fn()
      console.log(`  ✅ [PASS] ${name}`)
      passed++
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message)
      failed++
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn()
      console.log(`  ✅ [PASS] ${name}`)
      passed++
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message)
      failed++
    }
  }

  // 1. SSRF 防御测试
  await asyncTest('SSRF 防御：拦截 127.0.0.1 环回地址', async () => {
    const res = await validateAndNormalizeTargetUrl('http://127.0.0.1:8080/admin')
    assert.equal(res.valid, false)
  })

  await asyncTest('SSRF 防御：拦截 localhost 局域网访问', async () => {
    const res = await validateAndNormalizeTargetUrl('http://localhost:3000')
    assert.equal(res.valid, false)
  })

  await asyncTest('SSRF 防御：放行公网合法域名', async () => {
    const res = await validateAndNormalizeTargetUrl('https://github.com')
    assert.equal(res.valid, true)
  })

  // 2. 限流引擎测试
  test('限流引擎：正常请求放行', () => {
    const ip = 'test_ip_' + Date.now()
    const r1 = checkRateLimit(ip, 3, 5000)
    assert.equal(r1.allowed, true)
    const r2 = checkRateLimit(ip, 3, 5000)
    assert.equal(r2.allowed, true)
    const r3 = checkRateLimit(ip, 3, 5000)
    assert.equal(r3.allowed, true)
    const r4 = checkRateLimit(ip, 3, 5000)
    assert.equal(r4.allowed, false)
  })

  // 3. 用户名清洗与白名单测试
  test('用户名校验：拦截包含 XSS 脚本的用户名', () => {
    const r = validateUsername('<script>alert(1)</script>')
    assert.equal(r.valid, false)
  })

  test('用户名校验：剔除零宽字符并放行中文字符', () => {
    const r = validateUsername('\u200B极简书签\u200B')
    assert.equal(r.valid, true)
    assert.equal(r.clean, '极简书签')
  })

  test('用户名校验：拦截保留用户名 admin', () => {
    const r = validateUsername('admin')
    assert.equal(r.valid, false)
  })

  // 4. OWASP 密码哈希与平滑迁移
  test('密码哈希：100,000 次 PBKDF2 强哈希生成与校验', () => {
    const pwd = 'StrongPassword123!'
    const { hash, salt } = hashPassword(pwd)
    const verify = verifyPassword(pwd, hash, salt)
    assert.equal(verify.valid, true)
    assert.equal(verify.needsRehash, false)

    const wrong = verifyPassword('WrongPassword', hash, salt)
    assert.equal(wrong.valid, false)
  })

  // 5. 鉴权免登与签名 Token 持久化测试
  await asyncTest('鉴权引擎：365天防丢失签名 Token 生成与校验', async () => {
    const { createSession, getUserBySession, dbUsers, isRequestSecure, getAuthCookieOptions } = await import('../server/utils/index.ts')
    
    // 注册临时测试用户
    const testUserId = 'u_test_' + Date.now()
    await dbUsers.insert({
      id: testUserId,
      username: 'test_user_' + Date.now(),
      password_hash: 'hash',
      salt: 'salt',
      created_at: new Date().toISOString()
    })

    const token = await createSession(testUserId)
    assert.ok(token)
    assert.equal(token.split('.').length, 4, 'Token 应由 nonce.userId.expiresAt.signature 四段构成')

    const user = await getUserBySession(token)
    assert.ok(user)
    assert.equal(user.id, testUserId)

    // 测试 HTTP 与 HTTPS 下的 Cookie 安全标志智能配置
    const mockHttpEvent = { node: { req: { headers: { host: '192.168.1.100:3000' } } } }
    assert.equal(isRequestSecure(mockHttpEvent), false, '普通 HTTP 请求不应启用 secure 标志')
    const httpCookieOpts = getAuthCookieOptions(mockHttpEvent, true)
    assert.equal(httpCookieOpts.secure, false)

    const mockHttpsEvent = { node: { req: { headers: { 'x-forwarded-proto': 'https' } } } }
    assert.equal(isRequestSecure(mockHttpsEvent), true, 'HTTPS 反代请求应启用 secure 标志')
    const httpsCookieOpts = getAuthCookieOptions(mockHttpsEvent, true)
    assert.equal(httpsCookieOpts.secure, true)
  })

  // 6. 书签用户数据隔离与数据库同步删除测试
  await asyncTest('书签系统：按用户隔离存储与数据库同步删除', async () => {
    const { dbBookmarks } = await import('../server/utils/index.ts')

    const userA = 'u_user_a_' + Date.now()
    const userB = 'u_user_b_' + Date.now()

    const bm1 = {
      id: 'bm_a1_' + Date.now(),
      user_id: userA,
      title: '用户A的书签1',
      url: 'https://example-a.org',
      icon: 'bookmark',
      description: '描述A',
      summary: '总结A',
      tags: ['tagA'],
      created_at: '2026/08/20'
    }

    const bm2 = {
      id: 'bm_a2_' + Date.now(),
      user_id: userA,
      title: '用户A的书签2',
      url: 'https://example-a2.org',
      icon: 'bookmark',
      description: '描述A2',
      summary: '总结A2',
      tags: ['tagA'],
      created_at: '2026/08/20'
    }

    const bmB = {
      id: 'bm_b1_' + Date.now(),
      user_id: userB,
      title: '用户B的书签1',
      url: 'https://example-b.org',
      icon: 'bookmark',
      description: '描述B',
      summary: '总结B',
      tags: ['tagB'],
      created_at: '2026/08/20'
    }

    // 1. 插入书签
    await dbBookmarks.upsert(bm1)
    await dbBookmarks.upsert(bm2)
    await dbBookmarks.upsert(bmB)

    // 2. 验证用户隔离查询
    const aList = await dbBookmarks.findByUser(userA)
    const bList = await dbBookmarks.findByUser(userB)
    assert.equal(aList.length, 2, '用户A应拥有2个书签')
    assert.equal(bList.length, 1, '用户B应拥有1个书签')
    assert.ok(aList.every(b => b.user_id === userA), '用户A的书签列表中全部为用户A的数据')
    assert.ok(bList.every(b => b.user_id === userB), '用户B的书签列表中全部为用户B的数据')

    // 3. 验证跨用户删除防越权 (用户B不能删除用户A的书签)
    const crossDeleteResult = await dbBookmarks.delete(bm1.id, userB)
    assert.equal(crossDeleteResult, false, '用户B不应能删除用户A的书签')
    const aListAfterCross = await dbBookmarks.findByUser(userA)
    assert.equal(aListAfterCross.length, 2, '用户A的书签依然完整保留')

    // 4. 验证用户A按 ID 同步删除书签
    const deletedById = await dbBookmarks.delete(bm1.id, userA)
    assert.equal(deletedById, true, '用户A应成功删除书签1')
    const aListAfterDelete1 = await dbBookmarks.findByUser(userA)
    assert.equal(aListAfterDelete1.length, 1, '用户A书签数应减为1')
    assert.equal(aListAfterDelete1[0].id, bm2.id)

    // 5. 验证按 URL 兜底同步删除
    const deletedByUrl = await dbBookmarks.deleteByUrl(bm2.url, userA)
    assert.equal(deletedByUrl, true, '用户A应成功按网址删除书签2')
    const aListAfterDelete2 = await dbBookmarks.findByUser(userA)
    assert.equal(aListAfterDelete2.length, 0, '用户A书签库应已全部清空')

    // 验证用户B的书签未受影响
    const bListFinal = await dbBookmarks.findByUser(userB)
    assert.equal(bListFinal.length, 1, '用户B书签不受任何影响')

    // 清理测试数据
    await dbBookmarks.delete(bmB.id, userB)
  })

  console.log(`\n========================================`)
  console.log(`🎯 测试结果：${passed} 项通过, ${failed} 项失败`)
  console.log(`========================================\n`)

  if (failed > 0) process.exit(1)
}

runAllTests().catch((err) => {
  console.error('测试运行异常:', err)
  process.exit(1)
})
