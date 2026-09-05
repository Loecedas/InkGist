<template>
  <div class="snapshot-viewer-layout">
    <!-- 顶部极简悬浮工具栏 -->
    <header class="viewer-header">
      <div class="viewer-header-inner">
        <div class="header-left">
          <NuxtLink to="/snapshots" class="back-link-btn" title="返回网页快照库">
            <svg class="svg-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.arrowLeft"></svg>
            <span>快照库</span>
          </NuxtLink>

          <div class="header-divider"></div>

          <div class="header-doc-info" v-if="snapshot">
            <h1 class="header-doc-title" :title="snapshot.title">{{ snapshot.title }}</h1>
            <span class="header-offline-tag">100% 像素级原样归档</span>
          </div>
        </div>

        <div class="header-right" v-if="snapshot">
          <!-- 复制专属网址 -->
          <button
            class="header-btn"
            title="复制专属快照离线网址"
            @click="handleCopyUrl"
          >
            <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="isCopied ? ICONS.check : ICONS.share"></svg>
            <span>{{ isCopied ? '已复制网址' : '分享快照' }}</span>
          </button>

          <!-- 访问原网址 -->
          <a
            :href="snapshot.url"
            target="_blank"
            rel="noopener noreferrer"
            class="header-btn"
            title="新窗口打开原网页链接"
          >
            <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.external"></svg>
            <span class="desktop-only-text">原网页</span>
          </a>

          <!-- 主题切换 -->
          <button class="header-btn icon-only" :title="`当前主题：${currentLabel} (点击切换)`" @click="cycleTheme">
            <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="currentIconSvg"></svg>
          </button>

          <!-- 删除快照 -->
          <button class="header-btn danger-icon-btn icon-only" title="删除此快照" @click="handleDelete">
            <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.trash"></svg>
          </button>
        </div>
      </div>
    </header>

    <!-- 主体区域 -->
    <main class="viewer-iframe-wrapper">
      <!-- 加载中 -->
      <div v-if="isLoading" class="viewer-loading-state">
        <div class="loading-spinner"></div>
        <p>正在载入像素级原样网页快照与样式缓存...</p>
      </div>

      <!-- 找不到快照 -->
      <div v-else-if="!snapshot" class="viewer-not-found-state">
        <div class="not-found-icon-wrap">
          <svg class="svg-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.alert"></svg>
        </div>
        <h2>未找到该网页快照</h2>
        <p>该快照可能已被删除，或网址参数有误。</p>
        <NuxtLink to="/snapshots" class="return-btn">
          <span>返回快照库列表</span>
        </NuxtLink>
      </div>

      <!-- 像素级原样隔离沙箱 iframe (完全承载原网站排版、CSS、浮动、图片与字体，安全隔离宿主存储) -->
      <iframe
        v-else
        class="snapshot-sandbox-frame"
        :srcdoc="iframeSrcDoc"
        sandbox="allow-scripts allow-popups allow-forms"
        title="网页原样快照浏览"
      ></iframe>
    </main>

    <!-- Toast 提示 -->
    <div v-if="toastMessage" class="toast-notification">
      <span>{{ toastMessage }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from '#app'
import { ICONS, useSnapshots, useTheme, type SnapshotItem } from '../state'

const route = useRoute()
const router = useRouter()
const { themeMode, cycleTheme } = useTheme()
const { getSnapshot, deleteSnapshot, addSnapshot } = useSnapshots()

const currentLabel = computed(() => {
  if (themeMode.value === 'light') return '浅色'
  if (themeMode.value === 'dark') return '深色'
  return '跟随系统'
})

const currentIconSvg = computed(() => {
  if (themeMode.value === 'light') return ICONS.sun
  if (themeMode.value === 'dark') return ICONS.moon
  return ICONS.monitor
})

const snapshotId = String(route.params.id || '')
const snapshot = ref<SnapshotItem | null>(null)
const isLoading = ref(true)
const isCopied = ref(false)
const toastMessage = ref('')

const showToast = (msg: string) => {
  toastMessage.value = msg
  setTimeout(() => {
    if (toastMessage.value === msg) {
      toastMessage.value = ''
    }
  }, 2500)
}

// 组装无损沙箱 iframe 内容 (100% 呈现原网站所有内容、目录与排布，保证与原网像素级一致)
const iframeSrcDoc = computed(() => {
  if (!snapshot.value || !snapshot.value.contentHtml) return ''
  let html = snapshot.value.contentHtml
  const baseUrl = snapshot.value.url

  // 预清洗 HTML：移除可能残留的临时抓取通知气泡与冲突脚本
  html = html.replace(/<div[^>]*id=["'](?:__inkgist_temp_toast__|inkgist-temp-toast)["'][^>]*>[\s\S]*?<\/div>/gi, '')
  html = html.replace(/<div[^>]*class=["'][^"']*inkgist-toast[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '')

  // 停用破坏静态布局的第三方运行期脚本 (如 CSDN 动态注入重复工具栏、登录弹窗等)
  const scriptRegex = new RegExp('<script\\b([^>]*)>([\\s\\S]*?)<\\/script>', 'gi')
  html = html.replace(scriptRegex, (match, attrs) => {
    if (/type=["']application\/(?:ld\+json|json)["']/i.test(attrs)) {
      return match
    }
    return `<script type="text/inkgist-disabled" ${attrs}>/* script disabled */<` + `/script>`
  })

  // 净化原网页中未初始化的残留辅助输入框与弹层
  const cleanupStyle = `<style data-inkgist-cleanup="true">
    .bk-suggest, .wgt-suggest, .search-suggest, .sug-wrapper, .suggestions,
    .wgt-searchbar-main_help, .wgt-searchbar-main__help,
    .passport-login-container, .login-mark, .login-dialog, .guide-layer,
    #passport-login-pop, .help-box,
    form input[type="text"]:not([value]):not([placeholder]):not(:focus) {
      display: none !important;
    }
  </style>`

  // 如果已经是完整的 HTML 文档 (包含原网所有 CSS/DOM/目录/类名)
  if (/<html\b/i.test(html) || /<!DOCTYPE\b/i.test(html)) {
    const baseTag = `<base href="${baseUrl}" target="_blank">`
    const refTag = `<meta name="referrer" content="no-referrer">`
    if (/<head[^>]*>/i.test(html)) {
      if (/<base\b/i.test(html)) {
        html = html.replace(/<base[^>]*href=["'][^"']*["'][^>]*>/i, baseTag)
      } else {
        html = html.replace(/<head[^>]*>/i, `$&${baseTag}`)
      }
      if (/<meta\s+[^>]*name=["']referrer["'][^>]*>/i.test(html)) {
        html = html.replace(/<meta\s+[^>]*name=["']referrer["'][^>]*>/gi, refTag)
      } else {
        html = html.replace(/<head[^>]*>/i, `$&${refTag}`)
      }
      html = html.replace(/<\/head>/i, `${cleanupStyle}</head>`)
      return html
    }
    return `<!DOCTYPE html><html><head>${baseTag}${refTag}${cleanupStyle}</head>` + html + `</html>`
  }

  // 如果是纯片段 HTML (非完整文档)，组装标准沙箱页面
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <base href="${baseUrl}" target="_blank">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 24px auto; max-width: 960px; padding: 0 16px; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  ${html}
</body>
</html>`
})

const handleCopyUrl = async () => {
  if (typeof window === 'undefined') return
  try {
    await navigator.clipboard.writeText(window.location.href)
    isCopied.value = true
    showToast('专属离线快照网址已复制！')
    setTimeout(() => {
      isCopied.value = false
    }, 2000)
  } catch {
    showToast('复制网址失败')
  }
}

const handleDelete = async () => {
  if (!snapshot.value) return
  if (window.confirm(`确定要删除此快照《${snapshot.value.title}》吗？`)) {
    await deleteSnapshot(snapshot.value.id)
    router.push('/snapshots')
  }
}

onMounted(async () => {
  if (!snapshotId) {
    isLoading.value = false
    return
  }

  try {
    let data = await getSnapshot(snapshotId)

    if (!data) {
      try {
        const res = await $fetch<{ success: boolean; snapshot?: SnapshotItem }>(`/api/snapshot/get?id=${encodeURIComponent(snapshotId)}`)
        if (res && res.success && res.snapshot) {
          data = res.snapshot
          await addSnapshot(res.snapshot)
        }
      } catch {}
    }

    snapshot.value = data
  } catch (err) {
    console.error('Failed to load snapshot', err)
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped>
.snapshot-viewer-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-app);
  color: var(--text-main);
  overflow: hidden;
}

/* 顶部固定工具栏 */
.viewer-header {
  height: 48px;
  background-color: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-subtle);
  padding: 0 1.25rem;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  z-index: 50;
}

html.dark .viewer-header {
  background-color: rgba(17, 24, 39, 0.85);
}

.viewer-header-inner {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
  flex: 1;
}

.back-link-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.65rem;
  height: 30px;
  font-size: 0.8125rem;
  font-weight: 500;
  border-radius: var(--radius-full);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-main);
  text-decoration: none;
  flex-shrink: 0;
  box-shadow: var(--shadow-xs);
  transition: all 0.15s ease;
}

.back-link-btn:hover {
  background: var(--bg-surface-hover);
  border-color: var(--border-strong);
}

.header-divider {
  width: 1px;
  height: 16px;
  background: var(--border-subtle);
  flex-shrink: 0;
}

.header-doc-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.header-doc-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-main);
}

.header-offline-tag {
  font-size: 0.6875rem;
  padding: 0.15rem 0.45rem;
  border-radius: var(--radius-full);
  background: var(--bg-surface-subtle);
  color: var(--text-muted);
  border: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.header-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0 0.65rem;
  height: 30px;
  font-size: 0.8125rem;
  font-weight: 500;
  border-radius: var(--radius-full);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-main);
  cursor: pointer;
  text-decoration: none;
  box-shadow: var(--shadow-xs);
  transition: all 0.15s ease;
  box-sizing: border-box;
}

.header-btn:hover {
  background: var(--bg-surface-hover);
  border-color: var(--border-strong);
}

.header-btn.icon-only {
  padding: 0;
  width: 30px;
  justify-content: center;
}

.header-btn.danger-icon-btn:hover {
  background: var(--danger-50);
  border-color: var(--danger);
  color: var(--danger-700);
}

/* 主体 iframe 容器 (撑满全屏视口) */
.viewer-iframe-wrapper {
  flex: 1;
  width: 100%;
  height: calc(100vh - 48px);
  position: relative;
  overflow: hidden;
  background: #ffffff;
}

.snapshot-sandbox-frame {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
  background: #ffffff;
}

/* 加载 / 404 */
.viewer-loading-state,
.viewer-not-found-state {
  text-align: center;
  padding: 80px 20px;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--text-subtle);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.not-found-icon-wrap {
  display: inline-flex;
  margin-bottom: 16px;
  color: var(--text-subtle);
}

.return-btn {
  display: inline-flex;
  align-items: center;
  margin-top: 16px;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-sm);
  background: var(--primary);
  color: var(--primary-contrast);
  text-decoration: none;
  font-weight: 500;
  font-size: 0.8125rem;
}

/* Toast */
.toast-notification {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--primary);
  color: var(--primary-contrast);
  padding: 0.6rem 1.4rem;
  border-radius: var(--radius-full);
  font-size: 0.8125rem;
  font-weight: 500;
  box-shadow: var(--shadow-lg);
  z-index: 100;
  animation: fadeIn 0.2s ease;
  pointer-events: none;
}

@media (max-width: 640px) {
  .desktop-only-text {
    display: none;
  }
}
</style>
