<template>
  <div class="snapshots-page-layout">
    <!-- 顶部全宽常驻吸顶导航栏 (100% 满宽无两侧留白，与图三书签库导航栏保持完全一致) -->
    <header class="sticky-snapshots-header">
      <div class="header-inner-content">
        <div class="header-main-row">
          <div class="header-left-group">
            <div class="top-left-icon-box" title="墨萃 · 网页快照库">
              <svg class="svg-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.camera"></svg>
            </div>

            <!-- 搜索框 -->
            <div class="compact-search-box">
              <svg class="svg-icon search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.search"></svg>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="搜索已保存的网页标题、网址或描述..."
              />
              <button
                v-if="searchQuery"
                class="clear-search-btn"
                title="清空搜索"
                @click="searchQuery = ''"
              >
                <svg class="svg-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.close"></svg>
              </button>
            </div>
          </div>

          <!-- 右侧操作区：批量管理 + 小书签 + 主题切换 + 书签库 + 返回首页 -->
          <div class="header-right-actions">

            <!-- 批量管理按钮 -->
            <button
              class="nav-action-btn"
              :class="{ active: isSelectMode }"
              title="批量选择与管理快照"
              @click="toggleSelectMode"
            >
              <svg class="svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.checkSquare"></svg>
              <span>{{ isSelectMode ? '完成选择' : '批量管理' }}</span>
            </button>

            <!-- 快照小书签按钮 -->
            <button class="nav-action-btn" title="获取浏览器一键快照小书签 (避开防爬/100%原样图文)" @click="showBookmarkletModal = true">
              <svg class="svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.sparkles"></svg>
              <span>快照小书签</span>
            </button>

            <!-- 主题切换按钮 -->
            <button class="theme-toggle-btn" :title="`当前主题：${currentLabel} (点击切换)`" @click="cycleTheme">
              <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="currentIconSvg"></svg>
              <span class="theme-label">{{ currentLabel }}</span>
            </button>

            <!-- 书签库跳转 -->
            <NuxtLink to="/bookmarks" class="nav-switch-btn" title="进入书签库">
              <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.bookmark"></svg>
              <span>书签库</span>
            </NuxtLink>

            <!-- 首页跳转 -->
            <NuxtLink to="/" class="nav-switch-btn" title="返回首页">
              <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.home"></svg>
              <span>首页</span>
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- 仅边缘是雾化效果的水墨过渡层 (固定在吸顶导航底部) -->
      <div class="header-mist-edge"></div>
    </header>

    <!-- 下方主体展示区 (响应式自适应网格) -->
    <main class="snapshots-main-container">
      <div class="snapshots-inner-container">
        <!-- 列表顶部信息栏 -->
        <div class="gallery-header-row">
          <h3 class="section-heading">
            <span>已保存的网页</span>
            <span class="count-pill">{{ filteredSnapshots.length }}</span>
          </h3>

          <div v-if="snapshots.length > 0" class="sort-tip">
            <span>按保存时间倒序排列</span>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="filteredSnapshots.length === 0" class="empty-snapshots-state">
          <div class="empty-icon-wrap">
            <svg class="svg-icon" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.camera"></svg>
          </div>
          <h4 class="empty-title">{{ searchQuery ? '未找到匹配的快照' : '暂无已保存的网页快照' }}</h4>
          <p class="empty-desc">
            {{ searchQuery ? '请尝试更换搜索关键词' : '可通过右上角“快照小书签”在任意网页一键生成离线图文备份。' }}
          </p>
        </div>

        <!-- 快照卡片网格 (1024显示3列, 768显示2列, <=425显示1列) -->
        <div v-else class="snapshots-grid">
          <div
            v-for="item in filteredSnapshots"
            :key="item.id"
            class="snapshot-card"
            :class="{
              'is-select-mode': isSelectMode,
              'is-selected': selectedSnapshotIds.has(item.id)
            }"
            @click="handleCardWrapperClick(item.id)"
          >
            <!-- 批量管理选择复选框 -->
            <div
              v-if="isSelectMode"
              class="card-select-badge"
              :class="{ 'is-active': selectedSnapshotIds.has(item.id) }"
              @click.stop="toggleSelectSnapshot(item.id)"
            >
              <svg v-if="selectedSnapshotIds.has(item.id)" class="svg-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.check"></svg>
            </div>

            <!-- 封面图区域 -->
            <NuxtLink
              :to="isSelectMode ? '' : `/snapshot/${item.id}`"
              class="snapshot-cover-link"
              :tabindex="isSelectMode ? -1 : 0"
              @click.prevent="isSelectMode ? toggleSelectSnapshot(item.id) : null"
            >
              <div class="snapshot-cover-wrap">
                <img
                  v-if="getSnapshotCover(item)"
                  :src="getSnapshotCover(item)"
                  :alt="item.title"
                  class="snapshot-cover-img"
                  referrerpolicy="no-referrer"
                  loading="lazy"
                  @error="onImageError(item)"
                />
                <div v-else class="snapshot-cover-placeholder">
                  <div class="placeholder-brand-icon">
                    {{ getDisplaySiteName(item).slice(0, 1).toUpperCase() }}
                  </div>
                  <span class="placeholder-domain">{{ getDisplaySiteName(item) }}</span>
                  <span class="placeholder-tag">离线图文快照</span>
                </div>

                <div class="cover-overlay-badge">
                  <svg class="svg-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.eye"></svg>
                  <span>离线浏览</span>
                </div>
              </div>
            </NuxtLink>

            <!-- 快照信息区域 -->
            <div class="snapshot-card-body">
              <div class="snapshot-site-row">
                <span class="snapshot-site-name">{{ item.siteName || '网页快照' }}</span>
                <span class="snapshot-date">{{ formatDate(item.createdAt) }}</span>
              </div>

              <NuxtLink
                :to="isSelectMode ? '' : `/snapshot/${item.id}`"
                class="snapshot-title-link"
                @click.prevent="isSelectMode ? toggleSelectSnapshot(item.id) : null"
              >
                <h4 class="snapshot-title" :title="item.title">{{ item.title }}</h4>
              </NuxtLink>

              <!-- 说明文本：支持滚动查看全部完整内容 -->
              <div class="snapshot-desc-container">
                <p class="snapshot-desc" :title="item.description">
                  {{ item.description || '无文字描述' }}
                </p>
              </div>

              <!-- 底部操作与专属网址 -->
              <div class="snapshot-card-footer" @click.stop>
                <div class="snapshot-meta-info">
                  <span v-if="item.wordCount" class="word-count-badge">
                    约 {{ item.wordCount }} 字
                  </span>
                  <span class="offline-badge">永久离线</span>
                </div>

                <div class="snapshot-btn-group">
                  <!-- 复制专属快照网址 -->
                  <button
                    class="card-action-pill"
                    :title="`复制专属快照网址 (可在任意时刻离线访问)`"
                    @click="copySnapshotUrl(item.id)"
                  >
                    <svg class="svg-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="copiedId === item.id ? ICONS.check : ICONS.share"></svg>
                    <span>{{ copiedId === item.id ? '已复制' : '分享' }}</span>
                  </button>

                  <!-- 访问原网页 -->
                  <a
                    :href="item.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="card-action-pill"
                    title="新窗口打开原网页"
                  >
                    <svg class="svg-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.external"></svg>
                  </a>

                  <!-- 删除快照 -->
                  <button
                    class="card-action-pill danger-pill"
                    title="删除此快照"
                    @click="handleDelete(item)"
                  >
                    <svg class="svg-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.trash"></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 批量管理底部悬浮操作栏 -->
    <div v-if="isSelectMode" class="floating-bulk-bar">
      <div class="bulk-info-group">
        <span class="bulk-stats">已选 <strong>{{ selectedSnapshotIds.size }}</strong> 项</span>
        <button class="btn-bulk-act" @click="selectAllInCurrentView">
          {{ selectedSnapshotIds.size >= filteredSnapshots.length && filteredSnapshots.length > 0 ? '取消全选' : '全选当前' }}
        </button>
      </div>

      <div class="bulk-actions-group">
        <button class="btn-bulk-act btn-danger-bulk" :disabled="selectedSnapshotIds.size === 0" @click="batchDeleteSelected">
          <svg class="svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.trash"></svg>
          <span>批量删除 ({{ selectedSnapshotIds.size }})</span>
        </button>

        <button class="btn-bulk-act" @click="toggleSelectMode">退出管理</button>
      </div>
    </div>

    <!-- 底部全局微提示 -->
    <div v-if="toastMessage" class="toast-notification-pill">
      <span>{{ toastMessage }}</span>
    </div>

    <!-- 小书签安装弹窗 -->
    <BookmarkletModal v-model="showBookmarkletModal" default-tab="snapshot" />

    <!-- 系统自动检测与在线升级弹窗 -->
    <UpdateModal />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ICONS, useSnapshots, useTheme, type SnapshotItem } from './state'
import { useUpdater } from '../utils/updater'
import BookmarkletModal from '../components/BookmarkletModal.vue'
import UpdateModal from '../components/UpdateModal.vue'

definePageMeta({
  keepalive: true
})

const { themeMode, cycleTheme } = useTheme()
const { snapshots, addSnapshot, deleteSnapshot } = useSnapshots()
const { versionInfo, openUpdateModal, checkUpdateSilently } = useUpdater()

onMounted(() => {
  checkUpdateSilently()
})

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

const showBookmarkletModal = ref(false)
const searchQuery = ref('')
const copiedId = ref<string | null>(null)
const toastMessage = ref('')

// 批量管理状态
const isSelectMode = ref(false)
const selectedSnapshotIds = ref<Set<string>>(new Set())

const toggleSelectMode = () => {
  isSelectMode.value = !isSelectMode.value
  if (!isSelectMode.value) {
    selectedSnapshotIds.value.clear()
  }
}

const toggleSelectSnapshot = (id: string) => {
  if (selectedSnapshotIds.value.has(id)) {
    selectedSnapshotIds.value.delete(id)
  } else {
    selectedSnapshotIds.value.add(id)
  }
}

const handleCardWrapperClick = (id: string) => {
  if (isSelectMode.value) {
    toggleSelectSnapshot(id)
  }
}

const selectAllInCurrentView = () => {
  const allInView = filteredSnapshots.value.map(s => s.id)
  const isAllChosen = allInView.length > 0 && allInView.every(id => selectedSnapshotIds.value.has(id))
  if (isAllChosen) {
    allInView.forEach(id => selectedSnapshotIds.value.delete(id))
  } else {
    allInView.forEach(id => selectedSnapshotIds.value.add(id))
  }
}

const batchDeleteSelected = async () => {
  const count = selectedSnapshotIds.value.size
  if (count === 0) return
  if (!confirm(`确定要批量删除选中的 ${count} 篇网页快照吗？`)) return

  for (const id of selectedSnapshotIds.value) {
    await deleteSnapshot(id)
  }

  selectedSnapshotIds.value.clear()
  isSelectMode.value = false
  showToast(`已成功批量删除 ${count} 篇快照`)
}

const showToast = (msg: string) => {
  toastMessage.value = msg
  setTimeout(() => {
    if (toastMessage.value === msg) {
      toastMessage.value = ''
    }
  }, 2500)
}

// 过滤快照列表
const filteredSnapshots = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return snapshots.value
  return snapshots.value.filter(s =>
    (s.title && s.title.toLowerCase().includes(query)) ||
    (s.description && s.description.toLowerCase().includes(query)) ||
    (s.url && s.url.toLowerCase().includes(query)) ||
    (s.siteName && s.siteName.toLowerCase().includes(query))
  )
})

// 格式化日期
const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  } catch {
    return dateStr
  }
}

// 获取网站显示名称 (当无图片时用于封面填充展示)
const getDisplaySiteName = (item: SnapshotItem): string => {
  if (item.siteName && item.siteName.trim()) return item.siteName.trim()
  if (item.url) {
    try {
      const host = new URL(item.url).hostname.replace(/^www\./, '')
      return host
    } catch {}
  }
  return '网页快照'
}

// 智能获取封面图 (优先 coverImage，若缺失自动从正文 HTML 中解析第一张高清图)
const failedCovers = ref<Set<string>>(new Set())

const getSnapshotCover = (item: SnapshotItem): string | undefined => {
  if (failedCovers.value.has(item.id)) return undefined
  if (item.coverImage && item.coverImage.trim()) return item.coverImage

  if (item.contentHtml) {
    try {
      // 提取正文中主流文章图片 (优先匹配 data-actualsrc/data-original/src)
      const dataSrcMatch = item.contentHtml.match(/<img\b[^>]*?(?:data-actualsrc|data-original|data-src|data-lazy-src)=["']([^"']+)["'][^>]*?>/i)
      if (dataSrcMatch && dataSrcMatch[1] && !/spacer|blank\.gif|\.svg|icon/i.test(dataSrcMatch[1])) {
        return dataSrcMatch[1]
      }
      const srcMatch = item.contentHtml.match(/<img\b[^>]*?src=["']([^"']+)["'][^>]*?>/i)
      if (srcMatch && srcMatch[1] && !/spacer|blank\.gif|\.svg|icon|avatar/i.test(srcMatch[1])) {
        return srcMatch[1]
      }
    } catch {}
  }
  return undefined
}

// 图片加载失败降级
const onImageError = (item: SnapshotItem) => {
  failedCovers.value.add(item.id)
  item.coverImage = undefined
}

// 复制专属快照网址
const copySnapshotUrl = async (id: string) => {
  if (typeof window === 'undefined') return
  const fullUrl = `${window.location.origin}/snapshot/${id}`
  try {
    await navigator.clipboard.writeText(fullUrl)
    copiedId.value = id
    showToast('专属快照网址已复制到剪贴板！')
    setTimeout(() => {
      if (copiedId.value === id) copiedId.value = null
    }, 2000)
  } catch {
    showToast('复制失败，请手动复制网址')
  }
}

// 删除单个快照
const handleDelete = async (item: SnapshotItem) => {
  if (window.confirm(`确定要删除《${item.title}》的网页快照吗？删除后将无法通过专属网址离线访问。`)) {
    await deleteSnapshot(item.id)
    showToast('快照已删除')
  }
}
</script>

<style scoped>
.snapshots-page-layout {
  min-height: 100vh;
  background-color: var(--bg-app);
  color: var(--text-main);
  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

/* 顶部吸顶全宽导航栏：100% 宽度无两侧空白，与图三书签库完全一致 */
.sticky-snapshots-header {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  z-index: 50;
  background-color: var(--bg-app);
  border-bottom: none;
}

.header-inner-content {
  width: 100%;
  max-width: 100%;
  padding: 0.85rem 2rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.header-main-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
}

.header-left-group {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  flex: 1;
}

.top-left-icon-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--primary);
  box-shadow: var(--shadow-xs);
  flex-shrink: 0;
}

/* 搜索框 (支持聚焦平滑展开) */
.compact-search-box {
  position: relative;
  display: flex;
  align-items: center;
  width: 260px;
  transition: width 0.25s ease;
}

.compact-search-box:focus-within {
  width: 340px;
}

.compact-search-box input {
  width: 100%;
  flex: 1;
  min-width: 0;
  padding-left: 2rem;
  padding-right: 1.75rem;
  font-size: 0.8125rem;
  height: 34px;
  background-color: var(--bg-surface);
  border-radius: var(--radius-full);
  border: 1px solid var(--border-subtle);
  color: var(--text-main);
  box-sizing: border-box;
}

.search-icon {
  position: absolute;
  left: 0.65rem;
  color: var(--text-subtle);
  pointer-events: none;
}

.clear-search-btn {
  position: absolute;
  right: 0.5rem;
  color: var(--text-subtle);
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
}

/* 顶部右侧按钮 */
.header-right-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.nav-action-btn,
.theme-toggle-btn,
.nav-switch-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  height: 32px;
  padding: 0 0.75rem;
  font-size: 0.8125rem;
  font-weight: 500;
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  line-height: 1;
  box-sizing: border-box;
  text-decoration: none;
  transition: all 0.15s ease;
}

.nav-action-btn {
  color: var(--text-muted);
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
}

.nav-action-btn:hover {
  background-color: var(--bg-surface-hover);
  color: var(--text-main);
  border-color: var(--border-strong);
}

.nav-action-btn.active {
  background-color: var(--primary);
  color: var(--primary-contrast);
  border-color: var(--primary);
}

.nav-update-btn-header {
  position: relative;
  font-weight: 600;
}

.nav-update-btn-header.has-new {
  border-color: rgba(59, 130, 246, 0.4);
  color: var(--primary);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, var(--bg-surface) 100%);
}

.update-pulse-dot {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: #ef4444;
  box-shadow: 0 0 0 2px var(--bg-surface);
  animation: pulseDot 1.8s infinite;
}

@keyframes pulseDot {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 5px rgba(239, 68, 68, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}

.theme-toggle-btn {
  color: var(--text-main);
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
}

.theme-toggle-btn:hover {
  border-color: var(--text-main);
  background-color: var(--bg-surface-hover);
}

.nav-switch-btn {
  font-weight: 600;
  color: var(--primary-contrast) !important;
  background-color: var(--primary);
  border: 1px solid var(--primary);
}

.nav-switch-btn:hover {
  background-color: var(--primary-hover);
}

/* 仅下边缘是雾化效果的水墨过渡层 (紧贴 header 底部，全宽延伸) */
.header-mist-edge {
  position: absolute;
  bottom: -18px;
  left: 0;
  right: 0;
  width: 100%;
  height: 18px;
  pointer-events: none;
  background: linear-gradient(to bottom, var(--bg-app) 0%, transparent 100%);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  mask-image: linear-gradient(to bottom, black 0%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, black 0%, transparent 100%);
}

/* 下方主体滚动内容区 (与图三自适应流式排布一致) */
.snapshots-main-container {
  flex: 1;
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 1.25rem 2rem 3rem;
  box-sizing: border-box;
}

.snapshots-inner-container {
  width: 100%;
  max-width: 100%;
}

/* 顶部网址直接生成快照卡片 */
.url-snapshot-bar-card {
  margin-bottom: 1.5rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg, 14px);
  padding: 0.55rem 0.85rem;
  box-shadow: var(--shadow-xs);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  transition: all 0.2s ease;
}

.url-snapshot-bar-card:focus-within {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-sm);
}

.url-input-container {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
}

.input-lead-icon {
  color: var(--text-subtle);
  flex-shrink: 0;
  margin-left: 0.25rem;
}

.url-snapshot-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  color: var(--text-main);
  font-size: 0.875rem;
  padding: 0.45rem 0.2rem;
  outline: none;
}

.url-snapshot-input::placeholder {
  color: var(--text-subtle);
}

.clear-input-btn {
  background: transparent;
  border: none;
  color: var(--text-subtle);
  padding: 0.25rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-input-btn:hover {
  color: var(--text-main);
}

.btn-snapshot-submit {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 1.15rem;
  border-radius: var(--radius-full);
  background: var(--primary);
  color: var(--primary-contrast);
  font-size: 0.8125rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.btn-snapshot-submit:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

.btn-snapshot-submit:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none;
}

.url-snapshot-error-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  color: #ef4444;
  padding: 0.1rem 0.4rem;
}

/* 快照列表区头部 */
.gallery-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.section-heading {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-main);
}

.count-pill {
  font-size: 0.75rem;
  padding: 0.1rem 0.5rem;
  border-radius: var(--radius-full);
  background: var(--bg-surface);
  color: var(--text-muted);
  border: 1px solid var(--border-subtle);
}

.sort-tip {
  font-size: 0.75rem;
  color: var(--text-subtle);
}

/* 空状态 */
.empty-snapshots-state {
  text-align: center;
  padding: 4rem 1.5rem;
  background: var(--bg-surface);
  border: 1px dashed var(--border-subtle);
  border-radius: var(--radius-lg);
}

.empty-icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  border-radius: var(--radius-xl);
  background: var(--bg-surface-subtle);
  color: var(--text-subtle);
  margin-bottom: 1rem;
}

.empty-title {
  margin: 0 0 0.4rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-main);
}

.empty-desc {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-muted);
}

/* 快照卡片网格响应式规范：>=1440px显示4列, 1024~1439px显示3列 (包含1024px), 768~1023px显示2列, <768px显示1列 */
.snapshots-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
}

@media (min-width: 1440px) {
  .snapshots-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 1.25rem;
  }
}

@media (max-width: 1023px) {
  .snapshots-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
}

@media (max-width: 767px) {
  .snapshots-grid {
    grid-template-columns: 1fr;
    gap: 0.85rem;
  }
}

.snapshot-card {
  position: relative;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg, 14px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-xs);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.snapshot-card:hover {
  transform: translateY(-2px);
  border-color: var(--border-strong);
  box-shadow: var(--shadow-md);
}

.snapshot-card.is-select-mode {
  cursor: pointer;
  user-select: none;
}

.snapshot-card.is-selected {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary), var(--shadow-md);
}

/* 批量管理复选角标 */
.card-select-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 10;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: var(--bg-surface);
  border: 2px solid var(--border-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-contrast);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  transition: all 0.15s ease;
}

.card-select-badge.is-active {
  background: var(--primary);
  border-color: var(--primary);
}

/* 封面图 */
.snapshot-cover-link {
  display: block;
  text-decoration: none;
  color: inherit;
}

.snapshot-cover-wrap {
  position: relative;
  width: 100%;
  height: 165px;
  background: var(--bg-surface-subtle);
  overflow: hidden;
}

.snapshot-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.snapshot-card:hover .snapshot-cover-img {
  transform: scale(1.03);
}

.snapshot-cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(135deg, var(--bg-surface-subtle) 0%, var(--bg-surface) 100%);
  padding: 1.25rem 1rem;
  box-sizing: border-box;
  text-align: center;
}

.placeholder-brand-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--primary-subtle, rgba(59, 130, 246, 0.12));
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.placeholder-domain {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--text-main);
  max-width: 90%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.01em;
}

.placeholder-tag {
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--text-subtle);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  padding: 0.1rem 0.5rem;
  border-radius: var(--radius-full);
}

.cover-overlay-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0.2rem 0.55rem;
  border-radius: var(--radius-sm);
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  color: #ffffff;
  font-size: 0.6875rem;
  font-weight: 500;
}

/* 卡片信息区 */
.snapshot-card-body {
  padding: 1rem 1.15rem;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.snapshot-site-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-subtle);
}

.snapshot-site-name {
  font-weight: 500;
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.snapshot-title-link {
  text-decoration: none;
  color: inherit;
}

.snapshot-title {
  margin: 0 0 0.4rem;
  font-size: 0.9375rem;
  font-weight: 700;
  line-height: 1.4;
  color: var(--text-main);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.15s ease;
}

.snapshot-title:hover {
  color: var(--link-blue);
}

/* 说明文本容器：固定高度 + 纵向平滑滚动 (隐藏所有浏览器滚动条) */
.snapshot-desc-container {
  margin: 0 0 0.85rem;
  flex: 1;
}

.snapshot-desc {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--text-muted);
  max-height: 72px;
  overflow-y: auto;
  word-break: break-word;
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}

.snapshot-desc::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
}

.snapshot-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-subtle);
}

.snapshot-meta-info {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.word-count-badge,
.offline-badge {
  font-size: 0.6875rem;
  padding: 0.15rem 0.45rem;
  border-radius: var(--radius-full);
  background: var(--bg-surface-subtle);
  color: var(--text-muted);
  border: 1px solid var(--border-subtle);
}

.snapshot-btn-group {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.card-action-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.55rem;
  font-size: 0.75rem;
  border-radius: var(--radius-full);
  background: var(--bg-surface-subtle);
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  cursor: pointer;
  text-decoration: none;
  transition: all 0.15s ease;
}

.card-action-pill:hover {
  background: var(--bg-surface-hover);
  color: var(--text-main);
  border-color: var(--border-strong);
}

.card-action-pill.danger-pill:hover {
  background: var(--danger-50);
  border-color: var(--danger);
  color: var(--danger-700);
}

/* 底部悬浮批量管理工具栏 */
.floating-bulk-bar {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--bg-surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-full);
  padding: 0.6rem 1.25rem;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  animation: bulkBarSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes bulkBarSlideUp {
  from { opacity: 0; transform: translate(-50%, 20px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}

.bulk-info-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.bulk-stats {
  font-size: 0.85rem;
  color: var(--text-main);
  white-space: nowrap;
}

.bulk-stats strong {
  color: var(--primary);
}

.bulk-actions-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-bulk-act {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.85rem;
  border-radius: var(--radius-full);
  font-size: 0.775rem;
  font-weight: 500;
  background-color: var(--bg-surface-subtle);
  border: 1px solid var(--border-subtle);
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.btn-bulk-act:hover:not(:disabled) {
  background-color: var(--bg-surface-hover);
  border-color: var(--border-strong);
}

.btn-bulk-act:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn-danger-bulk {
  background-color: var(--danger-50) !important;
  color: var(--danger-700) !important;
  border-color: var(--danger) !important;
}

.btn-danger-bulk:hover:not(:disabled) {
  background-color: var(--danger) !important;
  color: #ffffff !important;
}

/* Toast 提示 */
.toast-notification-pill {
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

@keyframes fadeIn {
  from { opacity: 0; transform: translate(-50%, 8px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}

/* 1024 尺寸 (大于 768px 且 小于等于 1024px)：
   第 1 行：左侧 Logo 图标，右侧 操作功能按钮群；
   第 2 行：长搜索框充分向右拉伸充满 (100% 宽度)，布局与书签库 1024 尺寸完全一致 */
@media (min-width: 769px) and (max-width: 1024px) {
  .header-main-row {
    display: flex !important;
    flex-wrap: wrap !important;
    align-items: center !important;
    justify-content: flex-start !important;
    gap: 0.65rem 0.5rem !important;
    width: 100% !important;
  }

  .header-left-group {
    display: contents !important;
  }

  /* 第 1 行左侧：Logo 图标 */
  .top-left-icon-box {
    order: 1 !important;
    flex: 0 0 auto !important;
  }

  /* 第 1 行右侧：右上角操作按钮群 (靠最右端对齐) */
  .header-right-actions {
    order: 2 !important;
    margin-left: auto !important;
    flex: 0 0 auto !important;
    display: flex !important;
    align-items: center !important;
    gap: 0.45rem !important;
    white-space: nowrap !important;
  }

  /* 第 2 行：长搜索框独立占满整行 */
  .compact-search-box {
    order: 3 !important;
    flex: 1 1 100% !important;
    min-width: 200px !important;
    max-width: none !important;
    width: 100% !important;
    display: flex !important;
    box-sizing: border-box !important;
    margin: 0 !important;
  }

  .compact-search-box input {
    width: 100% !important;
    min-width: 0 !important;
    max-width: none !important;
    flex: 1 1 100% !important;
    box-sizing: border-box !important;
  }

  .compact-search-box:focus-within {
    width: 100% !important;
    flex: 1 1 100% !important;
  }
}

/* 768px 及所有移动端/小屏尺寸 (小于等于 768px)：
   1. 第 1 行：左侧 Logo 图标，右侧 5 个操作按钮
   2. 第 2 行：搜索框独立占满整行 (100% 宽度)
   3. 与书签库 768 尺寸完全一致 */
@media (max-width: 768px) {
  .sticky-snapshots-header {
    width: 100% !important;
    overflow-x: clip !important;
  }

  .header-inner-content {
    padding: 0.75rem 1rem 0.35rem !important;
    box-sizing: border-box !important;
    width: 100% !important;
    max-width: 100% !important;
  }

  .header-main-row {
    display: flex !important;
    flex-wrap: wrap !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 0.65rem 0.35rem !important;
    width: 100% !important;
    box-sizing: border-box !important;
  }

  .header-left-group {
    display: contents !important;
  }

  /* 第 1 行左侧：快照相机图标 */
  .top-left-icon-box {
    order: 1 !important;
    flex: 0 0 auto !important;
  }

  /* 第 1 行右侧：右上角操作按钮群 */
  .header-right-actions {
    order: 2 !important;
    margin-left: auto !important;
    flex: 0 0 auto !important;
    display: inline-flex !important;
    align-items: center !important;
    gap: 0.3rem !important;
    flex-wrap: nowrap !important;
  }

  /* 768 尺寸下：批量管理与快照小书签转为紧凑纯图标，主题切换与导航按钮保留完整文字与图标 */
  .header-right-actions .nav-action-btn span {
    display: none !important;
  }

  .header-right-actions .nav-action-btn {
    padding: 0 !important;
    width: 32px !important;
    min-width: 32px !important;
    max-width: 32px !important;
    height: 32px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    border-radius: var(--radius-full) !important;
    box-sizing: border-box !important;
    flex-shrink: 0 !important;
  }

  .header-right-actions .theme-toggle-btn,
  .header-right-actions .nav-switch-btn {
    height: 32px !important;
    padding: 0 0.75rem !important;
    width: auto !important;
    min-width: auto !important;
    max-width: none !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 0.35rem !important;
    border-radius: var(--radius-full) !important;
    box-sizing: border-box !important;
    flex-shrink: 0 !important;
    white-space: nowrap !important;
  }

  .header-right-actions .theme-toggle-btn span,
  .header-right-actions .nav-switch-btn span {
    display: inline-flex !important;
    align-items: center !important;
    line-height: 1 !important;
  }

  /* 第 2 行：搜索框换行占满整行 */
  .compact-search-box {
    order: 3 !important;
    width: 100% !important;
    max-width: 100% !important;
    flex: 1 1 100% !important;
    margin: 0 !important;
    box-sizing: border-box !important;
  }

  .compact-search-box input {
    width: 100% !important;
    box-sizing: border-box !important;
  }

  .compact-search-box:focus-within {
    width: 100% !important;
  }

  .snapshots-main-container {
    padding: 0.85rem 1rem 3rem !important;
    box-sizing: border-box !important;
    width: 100% !important;
    max-width: 100% !important;
  }
}

/* 640px 及以下移动端尺寸 (425px, 375px)：所有 5 个按钮统一收缩为极简纯图标模式，严密对齐锁定在第一行，绝不折行 */
@media (max-width: 640px) {
  .header-right-actions .theme-toggle-btn span,
  .header-right-actions .nav-switch-btn span {
    display: none !important;
  }

  .header-right-actions .theme-toggle-btn,
  .header-right-actions .nav-switch-btn {
    padding: 0 !important;
    width: 32px !important;
    min-width: 32px !important;
    max-width: 32px !important;
    height: 32px !important;
  }
}
</style>
