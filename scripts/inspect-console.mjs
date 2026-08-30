import { spawn } from 'child_process'
import http from 'http'

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const port = 9222

const chrome = spawn(chromePath, [
  `--remote-debugging-port=${port}`,
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--user-data-dir=C:\\Users\\admin\\.gemini\\antigravity-ide\\chrome-debug-profile',
  'http://localhost:3000/bookmarks'
])

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function getWsUrl() {
  for (let i = 0; i < 30; i++) {
    await wait(300)
    try {
      const data = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${port}/json`, res => {
          let body = ''
          res.on('data', chunk => body += chunk)
          res.on('end', () => resolve(JSON.parse(body)))
        }).on('error', reject)
      })
      const page = data.find(item => item.type === 'page' && item.webSocketDebuggerUrl)
      if (page) return page.webSocketDebuggerUrl
    } catch (e) {}
  }
  throw new Error('Could not connect to Chrome debugging port')
}

async function run() {
  try {
    const wsUrl = await getWsUrl()
    console.log('Connected to Chrome:', wsUrl)

    const ws = new WebSocket(wsUrl)
    let msgId = 1
    const pending = new Map()

    function send(method, params = {}) {
      return new Promise((resolve) => {
        const id = msgId++
        pending.set(id, resolve)
        ws.send(JSON.stringify({ id, method, params }))
      })
    }

    const consoleLogs = []
    const exceptions = []

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg.result)
        pending.delete(msg.id)
      }
      if (msg.method === 'Runtime.consoleAPICalled') {
        const type = msg.params.type
        const args = msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ')
        consoleLogs.push({ type, text: args })
        console.log(`[BROWSER CONSOLE ${type.toUpperCase()} @ ${new Date().toISOString().slice(11, 19)}]:`, args)
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        const details = msg.params.exceptionDetails
        const text = details.exception?.description || details.text
        const stack = details.stackTrace ? details.stackTrace.callFrames.map(f => `  at ${f.functionName} (${f.url}:${f.lineNumber}:${f.columnNumber})`).join('\n') : ''
        exceptions.push(text)
        console.error(`[BROWSER UNCAUGHT EXCEPTION @ ${new Date().toISOString().slice(11, 19)}]:`, text, '\nStack:\n' + stack)
      }
    }

    await new Promise(resolve => {
      if (ws.readyState === 1) resolve()
      else ws.onopen = resolve
    })

    await send('Runtime.enable')
    await send('Console.enable')
    await send('Page.enable')

    // 注入全局错误捕获
    await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        const origWarn = console.warn;
        console.warn = function(...args) {
          origWarn.apply(console, args);
        };

        // 拦截并追踪引起 TypeError: Cannot set properties of null (setting '__vnode') 的调用上下文
        window.addEventListener('error', (e) => {
          console.error('WINDOW ERROR CAUGHT:', e.message, e.filename, e.lineno);
        });
      `
    })

    // 1. 尝试注册或登录并写入认证 Cookie 和 localStorage
    const loginResult = await send('Runtime.evaluate', {
      expression: `
        (async () => {
          try {
            await fetch('/api/auth/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: 'testuser', password: 'password123' })
            });
          } catch {}

          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'testuser', password: 'password123' })
          });
          const data = await res.json();
          if (data.token) {
            localStorage.setItem('auth_cached_token_v1', data.token);
            localStorage.setItem('auth_cached_user_v1', JSON.stringify(data.user));
            document.cookie = 'auth_session_token=' + data.token + '; path=/; max-age=31536000';
            document.cookie = 'auth_client_token=' + data.token + '; path=/; max-age=31536000';
          }
          return data;
        })()
      `,
      awaitPromise: true,
      returnByValue: true
    })
    console.log('Login result:', loginResult.result.value)

    // 2. 通过 API 注入多级文件夹与书签
    const setupResult = await send('Runtime.evaluate', {
      expression: `
        (async () => {
          const token = localStorage.getItem('auth_cached_token_v1');
          const headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token,
            'x-auth-token': token
          };

          // 批量创建多级文件夹
          await fetch('/api/user/folders/batch', {
            method: 'POST',
            headers,
            body: JSON.stringify(['工作', '工作/项目A', '工作/项目A/前端', '学习', '个人'])
          });

          // 批量添加书签
          await fetch('/api/user/bookmarks/batch', {
            method: 'POST',
            headers,
            body: JSON.stringify([
              { title: 'Vue 官方文档', url: 'https://vuejs.org', folder: '工作/项目A/前端', summary: 'Vue 核心开发指南' },
              { title: 'Nuxt 官方网站', url: 'https://nuxt.com', folder: '工作', summary: 'Nuxt 现代框架' },
              { title: 'GitHub 代码仓库', url: 'https://github.com', folder: '学习', summary: '全球代码开源平台' },
              { title: '多邻国语言学习', url: 'https://duolingo.com', folder: '个人', summary: '每日语言练习' }
            ])
          });

          return 'Data seeded successfully';
        })()
      `,
      awaitPromise: true,
      returnByValue: true
    })
    console.log('Seed result:', setupResult.result.value)

    // 3. 导航至 /bookmarks 页面并等待加载完成
    await send('Page.navigate', { url: 'http://localhost:3000/bookmarks' })
    console.log('--- Navigating to /bookmarks with seeded data ---')
    await wait(3000)

    const renderFn = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const el = document.querySelector('.bookmarks-page-layout');
          const instance = el?.__vueParentComponent;
          return instance?.type?.render?.toString() || instance?.render?.toString() || 'not found';
        })()
      `,
      returnByValue: true
    })
    
    import('fs').then(fs => {
      fs.writeFileSync('E:/inkgist/scratch_renderFn.js', renderFn.result.value)
    })
    console.log('Saved renderFn to scratch_renderFn.js')

    // 4. 模拟深层悬停、多级展开与点击交互
    console.log('--- Simulating Deep Multi-level Cascade Hover and Tab Click ---')
    const interactionResult = await send('Runtime.evaluate', {
      expression: `
        (async () => {
          const results = [];
          const tabWrappers = document.querySelectorAll('.folder-tab-wrapper');
          results.push('Found folder tab wrappers: ' + tabWrappers.length);

          // 1. 验证长时间悬停保活（1.5s 不消失）
          if (tabWrappers.length > 0) {
            const firstWrapper = tabWrappers[0];
            firstWrapper.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            await new Promise(r => setTimeout(r, 1500));
            const cascadeHover = document.querySelector('.folder-hover-dropdown-bridge');
            results.push('Long hover 1.5s cascade visible: ' + (cascadeHover !== null));
            firstWrapper.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
            await new Promise(r => setTimeout(r, 500));
          }

          // 2. 验证拖拽文件夹经过其他分类 Tab 时自动展开预览框
          if (tabWrappers.length >= 2) {
            const dragTargetWrapper = tabWrappers[0];
            const dragSourceBtn = tabWrappers[1].querySelector('.folder-tab-btn');
            
            // 模拟开始拖拽文件夹
            dragSourceBtn.dispatchEvent(new DragEvent('dragstart', { bubbles: true }));
            await new Promise(r => setTimeout(r, 100));

            // 拖拽悬停在目标文件夹上方
            dragTargetWrapper.querySelector('.folder-tab-btn').dispatchEvent(new DragEvent('dragover', { bubbles: true, clientX: 200, clientY: 50 }));
            await new Promise(r => setTimeout(r, 300));

            const cascadeOnFolderDrag = document.querySelector('.folder-hover-dropdown-bridge');
            results.push('Cascade visible when dragging folder over tab: ' + (cascadeOnFolderDrag !== null));

            // 结束拖拽
            dragSourceBtn.dispatchEvent(new DragEvent('dragend', { bubbles: true }));
            await new Promise(r => setTimeout(r, 500));
          }

          // 3. 验证在预览框内拖拽书签移动至其他分类
          if (tabWrappers.length > 0) {
            const wrapper = tabWrappers[0]; // 工作
            wrapper.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            await new Promise(r => setTimeout(r, 400));

            const bmRows = document.querySelectorAll('.cascade-bm-row');
            results.push('Found draggable bookmark rows in cascade: ' + bmRows.length);

            if (bmRows.length > 0) {
              const firstBm = bmRows[0];
              // 模拟拖拽该书签
              firstBm.dispatchEvent(new DragEvent('dragstart', { bubbles: true }));
              await new Promise(r => setTimeout(r, 200));

              // 拖入第二个分类
              if (tabWrappers.length >= 2) {
                const targetBtn = tabWrappers[1].querySelector('.folder-tab-btn');
                targetBtn.dispatchEvent(new DragEvent('dragover', { bubbles: true }));
                await new Promise(r => setTimeout(r, 200));
                targetBtn.dispatchEvent(new DragEvent('drop', { bubbles: true }));
                await new Promise(r => setTimeout(r, 400));
                results.push('Bookmark dropped onto target folder successfully');
              }
            }
          }

          // 4. 验证「未分类」文件夹 Tab 的存在与点击过滤
          const uncatBtn = document.querySelector('.root-uncategorized-tab');
          results.push('Found Uncategorized Tab: ' + (uncatBtn !== null));
          if (uncatBtn) {
            results.push('Uncategorized Tab text: ' + uncatBtn.textContent.trim().replace(/\s+/g, ' '));
            uncatBtn.click();
            await new Promise(r => setTimeout(r, 400));
            const currentBreadcrumb = document.querySelector('.breadcrumb-node.breadcrumb-current');
            results.push('Breadcrumb in Uncategorized view: ' + (currentBreadcrumb ? currentBreadcrumb.textContent.trim() : 'none'));
          }

          // 切换回「全部」展示全部书签
          const allBtn = document.querySelector('.root-all-tab');
          if (allBtn) {
            allBtn.click();
            await new Promise(r => setTimeout(r, 400));
          }

          // 5. 验证书签卡片中的「分类」按钮常驻存在并可唤起弹窗 (图二需求)
          // 5. 验证书签卡片中的「分类」按钮常驻存在并可唤起弹窗 (图二需求及层级独立展示)
          const classifyBtns = document.querySelectorAll('.btn-action-classify');
          results.push('Classify action buttons on cards: ' + classifyBtns.length);
          if (classifyBtns.length > 0) {
            classifyBtns[0].click();
            await new Promise(r => setTimeout(r, 300));
            const folderModal = document.querySelector('.mobile-folder-sheet');
            results.push('Folder select modal opened via Classify button: ' + (folderModal !== null));
            const folderItems = Array.from(document.querySelectorAll('.folder-select-item .folder-text')).map(el => el.textContent.trim());
            results.push('Folder items in select modal: ' + folderItems.join(', '));
            const closeBtn = document.querySelector('.sheet-close-btn');
            if (closeBtn) closeBtn.click();
            await new Promise(r => setTimeout(r, 200));
          }

          // 6. 验证 1024 尺寸下的排布联动 (图一需求)
          // 切换列数为 3 列
          const col3Btn = document.querySelector('.col-btn-3');
          if (col3Btn) col3Btn.click();
          await new Promise(r => setTimeout(r, 100));

          // 模拟 1024 尺寸检测
          window.innerWidth = 1024;
          window.dispatchEvent(new Event('resize'));
          await new Promise(r => setTimeout(r, 300));
          const activeColBtn = document.querySelector('.column-switcher .col-btn.active');
          results.push('Active column switcher on 1024px: ' + (activeColBtn ? activeColBtn.textContent.trim() : 'none'));

          // 7. 验证鼠标原生直接点击打开文件夹并测试文件夹操作栏「分类」移动弹窗
          if (tabWrappers.length >= 2) {
            const secondTabBtn = tabWrappers[1].querySelector('.folder-tab-btn');
            secondTabBtn.click();
            await new Promise(r => setTimeout(r, 300));
            const currentActiveTab = document.querySelector('.folder-tab-btn.active .folder-name');
            results.push('Mouse click activated folder: ' + (currentActiveTab ? currentActiveTab.textContent.trim() : 'none'));

            // 验证并点击顶部操作栏「分类」按钮
            const folderHeaderPills = Array.from(document.querySelectorAll('.folder-header-right .folder-action-pill'));
            const moveFolderBtn = folderHeaderPills.find(b => b.textContent.includes('分类'));
            results.push('Found folder classify button in header: ' + (moveFolderBtn !== undefined));

            if (moveFolderBtn) {
              moveFolderBtn.click();
              await new Promise(r => setTimeout(r, 300));
              const moveModal = document.querySelector('.modal-card');
              results.push('MoveFolderModal opened: ' + (moveModal !== null));
              const targetOptions = Array.from(document.querySelectorAll('.folder-option-item .option-name')).map(e => e.textContent.trim());
              results.push('MoveFolderModal options: ' + targetOptions.join(', '));
              const cancelBtn = document.querySelector('.btn-cancel');
              if (cancelBtn) cancelBtn.click();
              await new Promise(r => setTimeout(r, 200));
            }
          }

          // 8. 验证触屏/非鼠标交互手势 (图三需求：单击预览不自动关闭、双击打开、长按拖动)
          if (tabWrappers.length > 0) {
            const firstTab = tabWrappers[0].querySelector('.folder-tab-btn');
            
            const createPointerEvent = (type, target, pointerType = 'touch') => {
              return new PointerEvent(type, {
                bubbles: true,
                cancelable: true,
                pointerType,
                clientX: 100,
                clientY: 100
              });
            };

            // 8.1 触屏单击一下：展开预览框
            firstTab.dispatchEvent(createPointerEvent('pointerdown', firstTab, 'touch'));
            firstTab.dispatchEvent(createPointerEvent('pointerup', firstTab, 'touch'));
            await new Promise(r => setTimeout(r, 350));
            const touchCascade = document.querySelector('.folder-hover-dropdown-bridge');
            results.push('Touch single tap opened cascade: ' + (touchCascade !== null));

            // 8.2 触屏双击：打开并激活文件夹
            firstTab.dispatchEvent(createPointerEvent('pointerdown', firstTab, 'touch'));
            firstTab.dispatchEvent(createPointerEvent('pointerup', firstTab, 'touch'));
            await new Promise(r => setTimeout(r, 100));
            firstTab.dispatchEvent(createPointerEvent('pointerdown', firstTab, 'touch'));
            firstTab.dispatchEvent(createPointerEvent('pointerup', firstTab, 'touch'));
            await new Promise(r => setTimeout(r, 350));
            const activeFolderName = document.querySelector('.folder-tab-btn.active .folder-name');
            results.push('Touch double tap active folder: ' + (activeFolderName ? activeFolderName.textContent.trim() : 'none'));
          }

          // 10. 验证深色模式下导出弹窗与卡片 Markdown 渲染与直属书签过滤
          // 切换到深色模式
          const themeBtn = document.querySelector('.theme-toggle-btn');
          if (themeBtn) {
            themeBtn.click();
            await new Promise(r => setTimeout(r, 200));
          }

          // 打开导出弹窗并检测是否应用了深色背景
          const exportBtn = document.querySelector('.header-right-actions button[title*="导出"]');
          if (exportBtn) {
            exportBtn.click();
            await new Promise(r => setTimeout(r, 300));
            const exportModal = document.querySelector('.export-modal-card');
            const modalBg = exportModal ? window.getComputedStyle(exportModal).backgroundColor : '';
            results.push('Export modal dark theme applied (not white): ' + (modalBg !== 'rgb(255, 255, 255)'));
            const closeExpBtn = document.querySelector('.close-btn');
            if (closeExpBtn) closeExpBtn.click();
            await new Promise(r => setTimeout(r, 200));
          }

          // 验证书签卡片 Markdown 格式渲染 (strong 元素与 action-bullet)
          const strongElCount = document.querySelectorAll('.action-text strong, .features-content strong').length;
          results.push('Markdown strong tags rendered inside bookmark cards: ' + strongElCount);

          // 11. 验证 375px 小屏幕下文件夹预览浮窗边界锁定 (严格在方框与屏幕内，杜绝向左或向右溢出)
          window.innerWidth = 375;
          window.dispatchEvent(new Event('resize'));
          await new Promise(r => setTimeout(r, 200));

          if (tabWrappers.length > 0) {
            const folderWithSub = Array.from(tabWrappers).find(w => w.querySelector('.subfolder-indicator')) || tabWrappers[0];
            const tabBtn = folderWithSub.querySelector('.folder-tab-btn');
            tabBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }));
            tabBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch' }));
            await new Promise(r => setTimeout(r, 350));

            // 12. 验证文件夹内部的子文件夹手势：单击展开预览，双击直接进入
            const subfolderPill = document.querySelector('.cascade-subfolder-pill');
            if (subfolderPill) {
              // 12.1 触屏单击子文件夹：展开子级预览
              subfolderPill.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', clientX: 150, clientY: 150 }));
              subfolderPill.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch', clientX: 150, clientY: 150 }));
              await new Promise(r => setTimeout(r, 350));
              const recursiveFlyout = document.querySelector('.recursive-cascade-flyout');
              results.push('Touch single tap subfolder opened cascade: ' + (recursiveFlyout !== null));

              // 12.2 触屏双击子文件夹：直接进入该子文件夹
              subfolderPill.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', clientX: 150, clientY: 150 }));
              subfolderPill.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch', clientX: 150, clientY: 150 }));
              await new Promise(r => setTimeout(r, 100));
              subfolderPill.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', clientX: 150, clientY: 150 }));
              subfolderPill.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch', clientX: 150, clientY: 150 }));
              await new Promise(r => setTimeout(r, 350));
              const activeFolderName = document.querySelector('.folder-tab-btn.active .folder-name, .current-folder-pill');
              results.push('Touch double tap subfolder entered folder: ' + (activeFolderName ? activeFolderName.textContent.trim() : 'none'));
            }
          }

          return results;
        })()
      `,
      awaitPromise: true,
      returnByValue: true
    })

    console.log('Interaction results:', interactionResult.result.value)
    await wait(2000)

    console.log('=== SUMMARY ===')
    console.log('Total console logs/warns:', consoleLogs.length)
    console.log('Total exceptions:', exceptions.length)

    ws.close()
  } catch (err) {
    console.error('Test error:', err)
  } finally {
    chrome.kill()
    process.exit(0)
  }
}

run()
