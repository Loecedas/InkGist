<template>
  <div v-if="modelValue" class="modal-backdrop" @click.self="closeModal">
    <div class="ext-modal-card" role="dialog" aria-modal="true" aria-labelledby="ext-modal-title">
      <!-- 弹窗头部 -->
      <div class="modal-header">
        <div class="modal-title-group">
          <div>
            <h3 id="ext-modal-title" class="modal-title">📂 一键导入浏览器书签</h3>
            <p class="modal-subtitle">直接读取当前浏览器收藏夹，自主勾选或一键全部导入</p>
          </div>
        </div>
        <button class="btn-flat btn-icon close-btn" title="关闭弹窗" @click="closeModal">
          <svg class="svg-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.close"></svg>
        </button>
      </div>

      <!-- 弹窗内容主体 (固定高度容器，杜绝尺寸跳动) -->
      <div class="modal-body">
        <!-- 状态一：已从扩展读取或已成功解析本地书签 -->
        <div v-if="detectedBookmarks.length > 0" class="ext-installed-view">
          <div class="success-banner-box">
            <svg class="svg-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.check"></svg>
            <span v-if="importSource === 'extension'">已成功连接【墨萃-InkGist】官方扩展并读取书签！</span>
            <span v-else>已成功解析本地书签文件（共 {{ detectedBookmarks.length }} 个有效网址）！</span>
          </div>

          <div v-if="isLoadingBookmarks" class="loading-state-box">
            <span class="spinner-icon"></span>
            <span>正在读取浏览器书签收藏夹...</span>
          </div>

          <div v-else class="bookmarks-preview-section">
            <!-- 顶部选择与筛选控制栏 -->
            <div class="preview-header-bar">
              <div class="header-left-controls">
                <label class="select-all-checkbox-label">
                  <input
                    type="checkbox"
                    :checked="isAllSelected"
                    @change="toggleSelectAll"
                  />
                  <span>{{ isSearching ? `全选搜索结果 (${selectedInViewCount}/${filteredBookmarks.length})` : `全选 (${selectedBookmarkUrls.size}/${detectedBookmarks.length})` }}</span>
                </label>
              </div>

              <!-- 搜索过滤栏 (带一键清空叉号按钮) -->
              <div class="search-filter-input-wrap">
                <input
                  v-model="searchFilter"
                  type="text"
                  class="search-field"
                  placeholder="搜索书签标题或网址..."
                />
                <button
                  v-if="searchFilter"
                  type="button"
                  class="clear-search-btn"
                  title="一键清空搜索"
                  @click="searchFilter = ''"
                >
                  <svg class="svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.close"></svg>
                </button>
              </div>
            </div>

            <!-- 书签列表 (带 Checkbox 勾选，固定高度并平滑滚动) -->
            <div class="bookmarks-list-box">
              <div
                v-for="(bm, idx) in filteredBookmarks"
                :key="bm.url + idx"
                class="bm-preview-item"
                :class="{ 'is-selected': selectedBookmarkUrls.has(bm.url) }"
                @click="toggleSelectBookmark(bm.url)"
              >
                <input
                  type="checkbox"
                  class="bm-checkbox"
                  :checked="selectedBookmarkUrls.has(bm.url)"
                  @click.stop="toggleSelectBookmark(bm.url)"
                />
                <span class="bm-idx">#{{ idx + 1 }}</span>
                <span v-if="bm.folder" class="bm-folder-badge" :title="`所属分类：${bm.folder}`">📁 {{ bm.folder }}</span>
                <span class="bm-title" :title="bm.title">{{ bm.title }}</span>
                <span class="bm-url" :title="bm.url">{{ bm.url }}</span>
              </div>
              <div v-if="filteredBookmarks.length === 0" class="no-match-hint">
                未找到匹配「{{ searchFilter }}」的书签
              </div>
            </div>

            <!-- 底部导入操作按钮群 -->
            <div class="import-action-buttons-row">
              <button
                class="btn-primary import-btn"
                :disabled="selectedBookmarkUrls.size === 0"
                @click="confirmImportSelected"
              >
                <span>一键导入所选书签 ({{ selectedBookmarkUrls.size }} 个)</span>
              </button>

              <button
                class="btn-secondary import-btn"
                @click="confirmImportAll"
              >
                <span>一键全部导入 (共 {{ detectedBookmarks.length }} 个)</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 状态二：未检测到插件或插件已关闭/删除，展示一键下载与极速安装指引 -->
        <div v-else class="ext-not-installed-view">
          <div v-if="connectionNotice" class="warning-banner-box">
            <span>{{ connectionNotice }}</span>
          </div>

          <div class="download-hero-card">
            <div class="hero-left">
              <span class="plugin-icon">🧩</span>
              <div>
                <h4 class="hero-title">墨萃-InkGist (浏览器官方扩展)</h4>
                <p class="hero-desc">获得官方授权，秒级一键直接读取当前浏览器的完整书签收藏夹！</p>
              </div>
            </div>
            <div class="download-actions-row">
              <a
                href="/inkgist-bookmarks-extension.zip"
                download="inkgist-bookmarks-extension.zip"
                class="btn-primary download-btn"
                @click="handleDownloadClick"
              >
                <span>{{ hasDownloaded ? '已开始下载 (点击重新下载)' : '一键下载插件包 (inkgist-bookmarks-extension.zip)' }}</span>
              </a>
            </div>
          </div>

          <!-- 3 步极简安装指南 -->
          <div class="install-steps-container">
            <h4 class="steps-main-title">3 步完成安装（仅需 15 秒，100% 成功）：</h4>

            <div class="steps-grid">
              <div class="step-card">
                <div class="step-num">1</div>
                <div class="step-content">
                  <h5>解压下载的压缩包</h5>
                  <p>下载 <code>inkgist-bookmarks-extension.zip</code> 后，右键将其解压到任意文件夹。</p>
                </div>
              </div>

              <div class="step-card">
                <div class="step-num">2</div>
                <div class="step-content">
                  <h5>打开扩展管理并开启开发者模式</h5>
                  <p>在 Chrome 或 Edge 打开扩展管理，开启右上角<strong>「开发者模式」</strong>：</p>
                  <div class="copy-url-row">
                    <code>chrome://extensions</code>
                    <button class="btn-flat btn-xs" @click="copyText('chrome://extensions')">复制 Chrome</button>
                    <button class="btn-flat btn-xs" @click="copyText('edge://extensions')">复制 Edge</button>
                  </div>
                </div>
              </div>

              <div class="step-card">
                <div class="step-num">3</div>
                <div class="step-content">
                  <h5>点击「加载已解压的扩展程序」</h5>
                  <p>点击扩展页面左上角的<strong>「加载已解压的扩展程序」</strong>，选中解压文件夹即可完成！</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 备用选项：无需插件，直接导入 HTML 书签文件 -->
          <div class="fallback-import-row">
            <span class="fallback-tip">💡 不想安装插件？您也可以直接选择浏览器导出的书签文件：</span>
            <button class="btn-secondary btn-sm" @click="triggerHtmlFileInput">
              <span>📂 选择 bookmarks.html 文件导入</span>
            </button>
            <input
              ref="fileInputRef"
              type="file"
              accept=".html,.htm"
              style="display: none;"
              @change="handleHtmlFileUpload"
            />
          </div>
        </div>
      </div>

      <!-- 底部操作栏 -->
      <div class="modal-footer">
        <button
          v-if="importSource !== 'extension'"
          class="btn-primary btn-sm manual-connect-btn"
          title="若刚在浏览器扩展页完成加载，点击立即连接插件并读取书签"
          @click="manualReconnect"
        >
          <span>已安装？点击立即连接 / 刷新</span>
        </button>
        <button class="btn-secondary btn-sm" @click="closeModal">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { ICONS } from '../pages/state'
import { parseBookmarkHtml } from '../utils/bookmark-io'

export interface ImportedBookmarkItem {
  url: string
  title: string
  folder?: string
  tags?: string[]
  icon?: string
  summary?: string
}

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'import-bookmarks', items: ImportedBookmarkItem[]): void
}>()

const isExtensionInstalled = ref(false)
const importSource = ref<'extension' | 'html' | null>(null)
const isLoadingBookmarks = ref(false)
const detectedBookmarks = ref<ImportedBookmarkItem[]>([])
const selectedBookmarkUrls = ref<Set<string>>(new Set())
const searchFilter = ref('')
const hasDownloaded = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const connectionNotice = ref('')

const closeModal = () => {
  emit('update:modelValue', false)
}

const handleDownloadClick = () => {
  hasDownloaded.value = true
}

const copyText = async (txt: string) => {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(txt)
      alert(`已复制: ${txt}\n请在浏览器新标签页地址栏中粘贴并回车打开！`)
    }
  } catch {}
}

const isSearching = computed(() => !!searchFilter.value.trim())

const filteredBookmarks = computed(() => {
  if (!searchFilter.value.trim()) return detectedBookmarks.value
  const query = searchFilter.value.trim().toLowerCase()
  return detectedBookmarks.value.filter(
    (b) => b.title.toLowerCase().includes(query) || b.url.toLowerCase().includes(query)
  )
})

// 当前过滤视图中被选中的书签数量
const selectedInViewCount = computed(() => {
  let count = 0
  for (const b of filteredBookmarks.value) {
    if (selectedBookmarkUrls.value.has(b.url)) count++
  }
  return count
})

const isAllSelected = computed(() => {
  if (filteredBookmarks.value.length === 0) return false
  return selectedInViewCount.value === filteredBookmarks.value.length
})

// 监听搜索词变化：搜索后只勾选搜索出来的结果，不要勾选其他的
watch(searchFilter, (newQuery) => {
  if (newQuery.trim()) {
    const query = newQuery.trim().toLowerCase()
    const matched = detectedBookmarks.value.filter(
      (b) => b.title.toLowerCase().includes(query) || b.url.toLowerCase().includes(query)
    )
    selectedBookmarkUrls.value = new Set(matched.map((b) => b.url))
  } else {
    // 清空搜索时，恢复全选所有书签
    selectedBookmarkUrls.value = new Set(detectedBookmarks.value.map((b) => b.url))
  }
})

const toggleSelectAll = () => {
  const currentList = filteredBookmarks.value
  if (isAllSelected.value) {
    // 反选当前视图下的项
    for (const b of currentList) {
      selectedBookmarkUrls.value.delete(b.url)
    }
  } else {
    // 全选当前视图下的项
    for (const b of currentList) {
      selectedBookmarkUrls.value.add(b.url)
    }
  }
}

const toggleSelectBookmark = (url: string) => {
  if (selectedBookmarkUrls.value.has(url)) {
    selectedBookmarkUrls.value.delete(url)
  } else {
    selectedBookmarkUrls.value.add(url)
  }
}

// 检测扩展存活并请求书签 (带实时探活超时)
const checkExtensionAndFetch = () => {
  if (typeof window === 'undefined') return
  if (importSource.value === 'html') return // 如果用户正在查看本地解析的书签，不打扰

  isLoadingBookmarks.value = true

  // 发送活跃探活与书签请求
  window.postMessage({ type: 'INKGIST_CHECK_EXTENSION', timestamp: Date.now() }, '*')
  window.postMessage({ type: 'INKGIST_REQ_BROWSER_BOOKMARKS', timestamp: Date.now() }, '*')

  // 350ms 超时探活：若插件未响应（如已被禁用或删除），自动置为未安装状态并显示安装界面
  setTimeout(() => {
    if (importSource.value !== 'html' && detectedBookmarks.value.length === 0) {
      isExtensionInstalled.value = false
      isLoadingBookmarks.value = false
    }
  }, 350)
}

const requestBookmarksFromExtension = () => {
  if (importSource.value === 'html') return
  isLoadingBookmarks.value = true
  window.postMessage({ type: 'INKGIST_REQ_BROWSER_BOOKMARKS', timestamp: Date.now() }, '*')
}

const handleWindowMessage = (event: MessageEvent) => {
  if (!event.data) return

  if (event.data.type === 'INKGIST_EXTENSION_PONG') {
    requestBookmarksFromExtension()
  }

  if (event.data.type === 'INKGIST_RESP_BROWSER_BOOKMARKS') {
    isLoadingBookmarks.value = false
    if (event.data.success && Array.isArray(event.data.bookmarks) && event.data.bookmarks.length > 0) {
      isExtensionInstalled.value = true
      importSource.value = 'extension'
      connectionNotice.value = ''
      detectedBookmarks.value = event.data.bookmarks
      // 默认全选
      selectedBookmarkUrls.value = new Set(event.data.bookmarks.map((b: any) => b.url))
    } else {
      // 插件被删除或未读取到有效书签，重置状态
      isExtensionInstalled.value = false
      if (importSource.value !== 'html') {
        detectedBookmarks.value = []
        importSource.value = null
      }
    }
  }
}

let pollTimer: any = null

const startPolling = () => {
  stopPolling()
  checkExtensionAndFetch()
  pollTimer = setInterval(() => {
    if (!isExtensionInstalled.value && importSource.value !== 'html') {
      checkExtensionAndFetch()
    }
  }, 1000)
}

const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

const manualReconnect = () => {
  importSource.value = null
  isExtensionInstalled.value = false
  detectedBookmarks.value = []
  connectionNotice.value = '正在检测扩展运行状态...'
  isLoadingBookmarks.value = true
  checkExtensionAndFetch()
  setTimeout(() => {
    if (!isExtensionInstalled.value && importSource.value !== 'html') {
      connectionNotice.value = '未检测到正在运行的扩展。若已在浏览器扩展管理中关闭，请开启扩展后点击刷新。'
    }
  }, 450)
}

watch(() => props.modelValue, (val) => {
  if (typeof document !== 'undefined') {
    if (val) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  }

  if (val) {
    searchFilter.value = ''
    connectionNotice.value = ''
    startPolling()
  } else {
    stopPolling()
  }
}, { immediate: true })

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('message', handleWindowMessage)
  }
})

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
  stopPolling()
  if (typeof window !== 'undefined') {
    window.removeEventListener('message', handleWindowMessage)
  }
})

const confirmImportSelected = () => {
  // 只导入当前被选中的书签
  const chosen = detectedBookmarks.value.filter((b) => selectedBookmarkUrls.value.has(b.url))
  if (chosen.length === 0) return
  emit('import-bookmarks', chosen)
  closeModal()
}

const confirmImportAll = () => {
  if (detectedBookmarks.value.length === 0) return
  emit('import-bookmarks', detectedBookmarks.value)
  closeModal()
}

// 备用 HTML 文件上传解析
const triggerHtmlFileInput = () => {
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
    fileInputRef.value.click()
  }
}

const handleHtmlFileUpload = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (event) => {
    const htmlContent = event.target?.result as string
    if (!htmlContent) return
    parseHtmlBookmarks(htmlContent)
  }
  reader.readAsText(file)
}

const parseHtmlBookmarks = (html: string) => {
  try {
    const validItems = parseBookmarkHtml(html)

    if (!validItems || validItems.length === 0) {
      alert('未从文件中识别到有效网页链接')
      return
    }

    importSource.value = 'html'
    isExtensionInstalled.value = false
    detectedBookmarks.value = validItems
    selectedBookmarkUrls.value = new Set(validItems.map((b) => b.url))
  } catch (err) {
    alert('解析书签文件失败，请确保为标准的 HTML 书签文件')
  }
}
</script>

<style scoped>
.bm-folder-badge {
  font-size: 0.6875rem;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 0.05rem 0.35rem;
  color: var(--text-muted);
  white-space: nowrap;
  flex-shrink: 0;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  animation: fadeIn 0.18s ease;
  overscroll-behavior: contain;
}

/* 固定弹窗尺寸自适应，杜绝溢出截断与跳动 */
.ext-modal-card {
  width: 100%;
  max-width: 640px;
  height: auto;
  max-height: 90vh;
  background-color: var(--bg-surface);
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-subtle);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  overscroll-behavior: contain;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1.15rem 1.5rem 0.85rem;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.modal-title-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.modal-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
}

.modal-subtitle {
  font-size: 0.8125rem;
  color: var(--text-muted);
  margin: 0;
}

.close-btn {
  color: var(--text-subtle);
}
.close-btn:hover {
  color: var(--text-main);
}

.modal-body {
  flex: 1;
  padding: 1.15rem 1.5rem;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  box-sizing: border-box;
}

.ext-not-installed-view {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  width: 100%;
}

.download-hero-card {
  background: var(--bg-surface-subtle);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  padding: 1.15rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  flex-shrink: 0;
}

.hero-left {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
}

.plugin-icon {
  font-size: 1.85rem;
  line-height: 1;
  flex-shrink: 0;
}

.hero-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0 0 0.35rem 0;
}

.hero-desc {
  font-size: 0.8125rem;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.5;
}

.download-actions-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.download-btn {
  display: inline-flex;
  width: auto;
  align-items: center;
  justify-content: center;
  padding: 0.45rem 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
  text-decoration: none;
  border-radius: var(--radius-md);
  box-sizing: border-box;
}

.install-steps-container {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  flex-shrink: 0;
  margin-top: 0.35rem;
}

.steps-main-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
}

.steps-grid {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.step-card {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.65rem 0.85rem;
  background-color: var(--bg-surface-subtle);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
}

.step-num {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background-color: var(--primary);
  color: var(--primary-contrast);
  font-size: 0.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
}

.step-content h5 {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0 0 0.15rem 0;
}

.step-content p {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.45;
}

.copy-url-row {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.2rem;
  background: var(--bg-surface);
  padding: 0.1rem 0.35rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
  width: fit-content;
}

.copy-url-row code {
  font-size: 0.72rem;
  color: var(--text-main);
  padding: 0 0.15rem;
}

.fallback-import-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding-top: 0.65rem;
  border-top: 1px dashed var(--border-subtle);
  flex-shrink: 0;
}

.fallback-tip {
  font-size: 0.75rem;
  color: var(--text-subtle);
}

.warning-banner-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--bg-surface-subtle);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  color: var(--text-muted);
  font-size: 0.78125rem;
  line-height: 1.4;
  flex-shrink: 0;
}

/* 已安装状态 */
.ext-installed-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 0;
}

.success-banner-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 0.85rem;
  background: var(--bg-surface-subtle);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  color: var(--text-main);
  font-size: 0.8125rem;
  font-weight: 600;
  flex-shrink: 0;
}

.loading-state-box {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-muted);
}

.bookmarks-preview-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 0;
}

.preview-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 4px 2px;
  flex-shrink: 0;
}

.select-all-checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-main);
  cursor: pointer;
}

.search-filter-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  width: 240px;
}

.search-field {
  width: 100%;
  height: 34px;
  padding: 0 1.75rem 0 0.75rem;
  font-size: 0.8125rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--bg-surface-subtle);
  color: var(--text-main);
  box-sizing: border-box;
  outline: none;
  transition: all 0.15s ease;
}
.search-field:focus {
  border-color: var(--primary);
  background-color: var(--bg-surface);
  box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.08);
}

.clear-search-btn {
  position: absolute;
  right: 6px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: var(--radius-sm);
  padding: 0;
}
.clear-search-btn:hover {
  background-color: var(--bg-surface-hover);
  color: var(--text-main);
}

.bookmarks-list-box {
  flex: 1;
  min-height: 180px;
  max-height: 230px;
  overflow-y: auto;
  overflow-x: hidden;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--bg-surface-subtle);
  box-sizing: border-box;
}

.bm-preview-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.45rem 0.75rem;
  border-bottom: 1px solid var(--border-subtle);
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.12s ease;
  width: 100%;
  box-sizing: border-box;
}
.bm-preview-item:hover {
  background-color: var(--bg-surface-hover);
}
.bm-preview-item.is-selected {
  background-color: var(--bg-surface);
}

.bm-checkbox {
  cursor: pointer;
  flex-shrink: 0;
}

.bm-idx {
  color: var(--text-subtle);
  font-family: var(--font-mono);
  min-width: 24px;
  flex-shrink: 0;
}

.bm-title {
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
  flex-shrink: 0;
}

.bm-url {
  color: var(--link-blue);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.no-match-hint {
  padding: 2.5rem 1rem;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.8125rem;
}

.import-action-buttons-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.import-btn {
  flex: 1;
  justify-content: center;
  padding: 0.55rem 1rem;
  font-size: 0.8125rem;
  font-weight: 600;
}

.empty-state-box {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  color: var(--text-muted);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-top: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media (max-width: 640px) {
  .ext-modal-card {
    height: auto;
    max-height: 85vh;
  }
  .modal-body {
    padding: 0.85rem 1rem;
  }
  .preview-header-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
  .search-filter-input-wrap {
    width: 100%;
  }
  .bookmarks-preview-section {
    gap: 0.6rem;
  }
  /* 仅在 425 和 375 尺寸下开启滑动，且去除末尾多余空白 */
  .bookmarks-list-box {
    min-height: 180px;
    max-height: 38vh;
    height: auto;
    overflow-x: auto;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    display: flex;
    flex-direction: column;
  }
  .bm-preview-item {
    min-width: 100%;
    width: max-content;
    box-sizing: border-box;
  }
  .bm-title {
    min-width: 100px;
    max-width: 180px;
    flex-shrink: 0;
  }
  .bm-url {
    flex: 1;
    min-width: 140px;
    max-width: none;
  }
  .import-action-buttons-row {
    flex-direction: column;
    gap: 0.5rem;
  }
  .modal-footer {
    padding: 0.6rem 1rem;
  }
}
</style>
