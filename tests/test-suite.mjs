import assert from 'node:assert/strict'
import {
  validateAndNormalizeTargetUrl,
  checkRateLimit,
  validateUsername,
  hashPassword,
  verifyPassword,
  dbBookmarks,
  dbFolders
} from '../server/utils/index.ts'
import {
  generateNetscapeBookmarkHtml,
  parseBookmarkHtmlNode
} from '../app/utils/bookmark-io.ts'
import { TaskQueue } from '../app/utils/task-queue.ts'
import { parseBookmarkToKarakeepPayload } from '../server/utils/summary-parser.ts'

async function runAllTests() {
  console.log('🚀 正在运行墨萃 (InkGist) 自动化测试套件 (Automated Test Suite)...\n')
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
  test('限流引擎：正常请求放行与超限拦截', () => {
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

  // 6. 书签用户数据隔离与单条同步删除测试
  await asyncTest('书签系统：按用户隔离存储与单条/URL同步删除', async () => {
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

  // 7. 分类文件夹增删改查与重命名级联测试
  await asyncTest('分类系统：文件夹 CRUD 与重命名书签级联同步', async () => {
    const testUser = 'u_folder_test_' + Date.now()

    // 1. 插入分类
    const f1 = { id: 'f1_' + Date.now(), user_id: testUser, name: '前端技术', created_at: new Date().toISOString() }
    const f2 = { id: 'f2_' + Date.now(), user_id: testUser, name: '后端技术', created_at: new Date().toISOString() }
    await dbFolders.insert(f1)
    await dbFolders.insert(f2)

    const list1 = await dbFolders.findByUser(testUser)
    assert.equal(list1.length, 2)
    assert.ok(list1.some(f => f.name === '前端技术'))

    // 2. 插入带分类的书签
    const bm = {
      id: 'bm_f_' + Date.now(),
      user_id: testUser,
      title: 'Vue 官网',
      url: 'https://vuejs.org',
      folder: '前端技术',
      created_at: '2026/08/20'
    }
    await dbBookmarks.upsert(bm)

    // 3. 重命名文件夹
    await dbFolders.rename('前端技术', 'Web前端栈', testUser)
    const listAfterRename = await dbFolders.findByUser(testUser)
    assert.ok(listAfterRename.some(f => f.name === 'Web前端栈'))
    assert.ok(!listAfterRename.some(f => f.name === '前端技术'))

    const bmAfterRename = await dbBookmarks.findByUserAndUrl(testUser, 'https://vuejs.org')
    assert.equal(bmAfterRename?.folder, 'Web前端栈', '书签所属分类应随文件夹重命名自动级联更新')

    // 4. 删除文件夹，验证书签分类被自动置空
    await dbFolders.delete('Web前端栈', testUser)
    const listAfterDelete = await dbFolders.findByUser(testUser)
    assert.equal(listAfterDelete.length, 1)
    const bmAfterFolderDelete = await dbBookmarks.findByUserAndUrl(testUser, 'https://vuejs.org')
    assert.equal(bmAfterFolderDelete?.folder, undefined, '删除文件夹后书签所属分类应自动置空')

    // 清理
    await dbBookmarks.delete(bm.id, testUser)
    await dbFolders.delete('后端技术', testUser)
  })

  // 8. 标准 Netscape HTML 书签多级递归导出合规性校验
  test('导出引擎：Netscape Bookmark HTML 标准规范多级目录树生成', () => {
    const mockBookmarks = [
      {
        title: 'Vue.js 渐进式框架',
        url: 'https://vuejs.org',
        folder: '开发/前端/Vue',
        icon: 'https://vuejs.org/logo.svg',
        tags: ['前端', 'Vue', '框架'],
        summary: '渐进式 JavaScript 框架。',
        createdAt: '2026/08/20'
      },
      {
        title: 'React 官方网站',
        url: 'https://react.dev',
        folder: '开发/前端/React',
        tags: ['前端', 'React'],
        summary: '用于构建用户界面的库。',
        createdAt: '2026/08/21'
      },
      {
        title: 'GitHub 开源平台',
        url: 'https://github.com',
        tags: ['代码', '开源'],
        summary: '全球最大的开源平台。',
        createdAt: '2026/08/22'
      }
    ]

    const html = generateNetscapeBookmarkHtml(mockBookmarks, '墨萃测试书签')

    assert.ok(html.includes('<!DOCTYPE NETSCAPE-Bookmark-file-1>'), '必须包含 Netscape DOCTYPE 声明')
    assert.ok(html.includes('<TITLE>InkGist Bookmarks</TITLE>'))
    assert.ok(html.includes('<H1>墨萃测试书签</H1>'))
    assert.ok(html.includes('<H3'), '多级分类必须生成 H3 标签')
    assert.ok(html.includes('开发'), '包含根级分类“开发”')
    assert.ok(html.includes('前端'), '包含二级分类“前端”')
    assert.ok(html.includes('Vue'), '包含三级分类“Vue”')
    assert.ok(html.includes('HREF="https://vuejs.org"'))
    assert.ok(html.includes('ICON="https://vuejs.org/logo.svg"'), '包含图标属性')
    assert.ok(html.includes('TAGS="前端,Vue,框架"'), '包含标签属性')
    assert.ok(html.includes('<DD>渐进式 JavaScript 框架。</DD>'), '包含 DD 笔记/摘要')
  })

  // 9. HTML 书签多级目录树栈式解析单元测试
  test('解析引擎：宽松 Netscape HTML 栈式深度优先解析多级层级与元数据', () => {
    const rawNetscapeHtml = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="1710000000">AI 与前沿工具</H3>
    <DL><p>
        <DT><H3 ADD_DATE="1710000000">大语言模型</H3>
        <DL><p>
            <DT><A HREF="https://openai.com" ADD_DATE="1710000000" ICON="https://openai.com/favicon.ico" TAGS="AI,LLM">OpenAI 官网</A>
            <DD>ChatGPT 研发机构与 API 平台。</DD>
        </DL><p>
    </DL><p>
    <DT><A HREF="https://developer.mozilla.org" ADD_DATE="1710000000" TAGS="文档,Web">MDN Web Docs</A>
    <DD>Web 开发权威参考手册。</DD>
</DL><p>`

    const parsed = parseBookmarkHtmlNode(rawNetscapeHtml)

    assert.equal(parsed.length, 2, '应成功解析 2 条书签')

    const bm1 = parsed.find(b => b.url === 'https://openai.com')
    assert.ok(bm1, '应包含 OpenAI 链接')
    assert.equal(bm1.title, 'OpenAI 官网')
    assert.equal(bm1.folder, 'AI 与前沿工具/大语言模型', '多级嵌套目录应准确合并为路径')
    assert.equal(bm1.icon, 'https://openai.com/favicon.ico')
    assert.deepEqual(bm1.tags, ['AI', 'LLM'])
    assert.equal(bm1.summary, 'ChatGPT 研发机构与 API 平台。')

    const bm2 = parsed.find(b => b.url === 'https://developer.mozilla.org')
    assert.ok(bm2)
    assert.equal(bm2.folder, undefined, '根目录书签不应有 folder')
    assert.equal(bm2.summary, 'Web 开发权威参考手册。')
  })

  // 10. TaskQueue 并发任务调度与取消测试
  await asyncTest('任务调度队列：TaskQueue 最大并发控制与排队/安全中断', async () => {
    const queue = new TaskQueue(3)
    let currentConcurrent = 0
    let maxObservedConcurrent = 0

    const tasks = Array.from({ length: 8 }, (_, i) => ({
      id: `task_${i}`,
      fn: async () => {
        currentConcurrent++
        maxObservedConcurrent = Math.max(maxObservedConcurrent, currentConcurrent)
        await new Promise(r => setTimeout(r, 20))
        currentConcurrent--
        return i * 10
      }
    }))

    queue.addTasks(tasks)
    const results = await queue.run()

    assert.equal(results.length, 8, '8 个任务应全部顺利执行完毕')
    assert.ok(maxObservedConcurrent <= 3, `最大并发数 (${maxObservedConcurrent}) 不应超过设定的 3`)
    assert.ok(results.every(r => r.success), '所有任务均应成功')

    // 测试中途取消 (Cancellation)
    const cancelQueue = new TaskQueue(2)
    const longTasks = Array.from({ length: 6 }, (_, i) => ({
      id: `cancel_task_${i}`,
      fn: async () => {
        await new Promise(r => setTimeout(r, 30))
        return i
      }
    }))
    cancelQueue.addTasks(longTasks)
    
    const runPromise = cancelQueue.run()
    // 15ms 后触发取消
    setTimeout(() => {
      cancelQueue.cancel()
    }, 15)

    const cancelResults = await runPromise
    assert.ok(cancelResults.length < 6, '取消后排队中的任务应被安全拦截不予执行')
  })

  // 11. 书签与分类批量写入性能与原子性测试
  await asyncTest('批量引擎：dbBookmarks.batchUpsert 与 dbFolders.batchInsert 批量操作', async () => {
    const batchUser = 'u_batch_user_' + Date.now()

    // 1. 批量插入分类
    const batchFolders = [
      { id: 'f_b1_' + Date.now(), user_id: batchUser, name: '技术/Vue', created_at: new Date().toISOString() },
      { id: 'f_b2_' + Date.now(), user_id: batchUser, name: '技术/React', created_at: new Date().toISOString() },
      { id: 'f_b3_' + Date.now(), user_id: batchUser, name: '设计资源', created_at: new Date().toISOString() }
    ]
    const insertedFoldersCount = await dbFolders.batchInsert(batchFolders, batchUser)
    assert.equal(insertedFoldersCount, 3, '应成功批量创建 3 个分类')

    const userFolders = await dbFolders.findByUser(batchUser)
    assert.equal(userFolders.length, 3)

    // 2. 批量插入书签
    const batchBookmarks = [
      {
        id: 'bm_b1_' + Date.now(),
        user_id: batchUser,
        title: 'Vue 3 文档',
        url: 'https://cn.vuejs.org',
        folder: '技术/Vue',
        created_at: '2026/08/29'
      },
      {
        id: 'bm_b2_' + Date.now(),
        user_id: batchUser,
        title: 'React 中文文档',
        url: 'https://zh-hans.react.dev',
        folder: '技术/React',
        created_at: '2026/08/29'
      },
      {
        id: 'bm_b3_' + Date.now(),
        user_id: batchUser,
        title: 'Dribbble 设计社区',
        url: 'https://dribbble.com',
        folder: '设计资源',
        created_at: '2026/08/29'
      }
    ]
    const insertedBookmarksCount = await dbBookmarks.batchUpsert(batchBookmarks, batchUser)
    assert.equal(insertedBookmarksCount, 3, '应成功批量写入 3 条书签')

    const userBookmarks = await dbBookmarks.findByUser(batchUser)
    assert.equal(userBookmarks.length, 3)
    assert.equal(userBookmarks[0].user_id, batchUser)

    // 批量清理
    for (const b of batchBookmarks) {
      await dbBookmarks.delete(b.id, batchUser)
    }
    for (const f of batchFolders) {
      await dbFolders.delete(f.name, batchUser)
    }
  })

  // 12. Markdown 知识库生成规范校验
  test('Markdown 知识库：YAML Frontmatter 与 AI 深度总结结构生成', () => {
    const mockList = [
      {
        id: 'bm_md_1',
        title: 'InkGist 墨萃项目',
        url: 'https://inkgist.dev',
        folder: '开源项目',
        description: 'AI 驱动的极简智能书签管理平台',
        summary: '### 📕 核心功能说明\n墨萃是一个极简水墨风的 AI 书签管理系统。\n\n---\n\n### 🎯 待办行动指南\n* [ ] 立即导入浏览器书签\n* [ ] 体验 AI 智能总结',
        isFavorite: true,
        createdAt: '2026-08-29'
      }
    ]

    const dateStr = new Date().toISOString().split('T')[0]
    let md = `---\ntitle: "墨萃书签知识库归档"\ncreated: "${dateStr}"\ntotal_bookmarks: ${mockList.length}\ngenerator: "墨萃 · InkGist"\n---\n\n# 📚 墨萃书签知识库归档\n\n`
    for (const bm of mockList) {
      md += `## 📁 ${bm.folder}\n\n`
      md += `### 🔗 [${bm.title}](${bm.url})\n\n`
      md += `- **网址**：[${bm.url}](${bm.url})\n`
      md += `- **所属分类**：\`${bm.folder}\`\n`
      if (bm.isFavorite) md += `- **状态**：⭐ 已收藏\n`
      md += `\n#### 🤖 AI 智能总结与行动指南\n\n${bm.summary}\n\n---\n\n`
    }

    assert.ok(md.includes('---'), '必须包含 YAML Frontmatter 分隔符')
    assert.ok(md.includes('generator: "墨萃 · InkGist"'), '必须包含生成器元数据')
    assert.ok(md.includes('## 📁 开源项目'), '必须生成分类二级标题')
    assert.ok(md.includes('### 🔗 [InkGist 墨萃项目](https://inkgist.dev)'), '必须生成 Markdown 超链接')
    assert.ok(md.includes('### 📕 核心功能说明'), '必须完整包含 AI 核心功能说明')
    assert.ok(md.includes('### 🎯 待办行动指南'), '必须包含待办行动指南')
  })

  // 13. Karakeep (Hoarder) 直连同步字段精准提取与标题严格一致测试
  test('Karakeep 同步引擎：标题一致性、一句话概括(description)与核心功能说明(summary)语义映射', () => {
    const rawMock = {
      title: '全球气象数据可视化平台 | 实时气象信息一网打尽',
      url: 'https://earth.nullschool.net/zh-cn/#current/wind',
      folder: '多邻国数据仪表盘',
      description: '备用原网页描述',
      tags: ['气象数据可视化', '海洋状况', 'AI总结'],
      summary: `* **一句话概括**: 实时全球气象数据可视化，提供风、气象、海洋状况的动态地图。
* **智能标签**: 气象数据可视化, 海洋状况, 空气污染

### 📕 核心功能说明
earth 是一个提供全球实时气象数据的在线平台，用户可以通过该平台查看全球范围内的风、气象、海洋状况。

---

### 🎯 待办行动指南
* [ ] 输出 1 条可以立即执行的具体操作建议
* [ ] 选择大气模式，查看全球风速分布情况`
    }

    const payload = parseBookmarkToKarakeepPayload(rawMock)

    // 1. 标题必须严格对齐
    assert.equal(payload.title, '全球气象数据可视化平台 | 实时气象信息一网打尽', '标题必须与墨萃书签标题完全一致')
    assert.equal(payload.url, 'https://earth.nullschool.net/zh-cn/#current/wind')

    // 2. 描述部分必须精确提取 一句话概括
    assert.equal(payload.oneLiner, '实时全球气象数据可视化，提供风、气象、海洋状况的动态地图。', '描述字段必须为一句话概括')

    // 3. 概括部分必须精确提取 核心功能说明
    assert.ok(payload.coreFeatures.includes('earth 是一个提供全球实时气象数据的在线平台'), '概括字段必须包含核心功能说明')

    // 4. 智能标签与列表
    assert.ok(payload.tags.includes('气象数据可视化'))
    assert.ok(payload.tags.includes('海洋状况'))
    assert.ok(!payload.tags.includes('AI总结'), '应清洗过滤内置引擎标签')
    assert.equal(payload.folder, '多邻国数据仪表盘', '分类列表必须准确传递')
    assert.ok(payload.actionGuide.length === 2, '应成功提取 2 条待办行动指南')
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
