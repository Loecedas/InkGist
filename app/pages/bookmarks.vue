<template>
  <div class="bookmarks-page-layout">
    <!-- 顶部全宽常驻吸顶导航栏 (100% 满宽无两侧留白，吸顶固定不动，仅下边缘为水墨雾化模糊) -->
    <header class="sticky-bookmarks-header">
      <div class="header-inner-content">
        <!-- 顶部第一行：左侧 Logo + 搜索 + 列切换；右侧 操作按钮组 -->
        <div class="header-main-row">
          <div class="header-left-group">
            <div class="top-left-icon-box" title="墨萃 · 书签库">
              <svg class="svg-icon bookmark-header-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.bookmark"></svg>
            </div>

            <div class="compact-search-box">
              <svg class="svg-icon search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.search"></svg>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="搜索书签标题、网址或内容..."
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

            <!-- 桌面端列数切换 -->
            <div class="column-switcher" title="切换每行排布数量">
              <span class="switcher-text">每行排布:</span>
              <button
                v-for="col in ([1, 2, 3] as const)"
                :key="col"
                :class="['col-btn', `col-btn-${col}`, { active: columns === col }]"
                :title="`一行显示 ${col} 个书签`"
                @click="setColumns(col)"
              >
                <svg class="svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS[`grid-${col}`]"></svg>
                <span>{{ col === 1 ? '1列(详细)' : `${col}列` }}</span>
              </button>
            </div>
          </div>

          <!-- 右上角操作区：退出登录 + 主题切换 + 返回首页 -->
          <div class="header-right-actions">
            <button class="nav-logout-btn" title="退出登录" @click="handleLogout">
              <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.logout"></svg>
              <span>退出登录</span>
            </button>

            <button class="theme-toggle-btn" :title="`当前主题：${currentLabel} (点击切换)`" @click="cycleTheme">
              <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="currentIconSvg"></svg>
              <span class="theme-label">{{ currentLabel }}</span>
            </button>

            <NuxtLink to="/" class="nav-switch-btn" title="进入首页">
              <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.home"></svg>
              <span>首页</span>
            </NuxtLink>
          </div>
        </div>

        <!-- 顶部第二行：分类文件夹导航栏 -->
        <div class="folders-nav-row">
          <!-- 全部书签 Tab -->
          <button
            class="folder-tab-btn"
            :class="{ active: activeFolder === 'all', 'is-drag-target': dragOverFolder === 'all' }"
            title="点击查看所有书签，也可将卡片拖入此移出文件夹"
            @click="activeFolder = 'all'"
            @dragover.prevent="handleDragOverFolder('all')"
            @dragleave="handleDragLeaveFolder('all')"
            @drop="handleDropFolder('all')"
          >
            <svg class="svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.folder"></svg>
            <span class="folder-name">全部</span>
            <span class="folder-count">({{ bookmarks.length }})</span>
          </button>

          <!-- 用户自定义分类文件夹 Tabs -->
          <div
            v-for="folder in folders"
            :key="folder.id"
            class="folder-tab-wrapper"
            @mouseenter="openFolderHover(folder.name)"
            @mouseleave="scheduleCloseFolderHover"
          >
            <button
              class="folder-tab-btn"
              :class="{ active: activeFolder === folder.name, 'is-drag-target': dragOverFolder === folder.name }"
              :title="`点击仅显示 [${folder.name}] 中的书签，长按卡片可拖拽入此`"
              @click="activeFolder = folder.name"
              @dragover.prevent="handleDragOverFolder(folder.name)"
              @dragleave="handleDragLeaveFolder(folder.name)"
              @drop="handleDropFolder(folder.name)"
            >
              <svg class="svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.folder"></svg>
              <span class="folder-name">{{ folder.name }}</span>
              <span class="folder-count">({{ getFolderBookmarks(folder.name).length }})</span>
            </button>

            <!-- 鼠标悬停预览浮窗 (支持鼠标无缝滑入并交互) -->
            <div
              v-if="hoveredFolder === folder.name"
              class="folder-hover-dropdown-bridge"
              @mouseenter="cancelCloseFolderHover"
              @mouseleave="scheduleCloseFolderHover"
            >
              <div class="folder-hover-dropdown">
                <div class="dropdown-header">
                  <div class="dropdown-title-group">
                    <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.folder"></svg>
                    <span class="dropdown-folder-title">{{ folder.name }}</span>
                    <span class="dropdown-count-badge">{{ getFolderBookmarks(folder.name).length }} 项</span>
                  </div>

                  <div class="dropdown-actions-group">
                    <button
                      class="btn-dropdown-action"
                      title="重命名此文件夹"
                      @click.stop.prevent="startRenameFolder(folder.name)"
                    >
                      <svg class="svg-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.edit"></svg>
                      <span>重命名</span>
                    </button>

                    <button
                      class="btn-dropdown-action btn-danger-action"
                      title="删除此文件夹"
                      @click.stop.prevent="handleDeleteFolder(folder.name)"
                    >
                      <svg class="svg-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.trash"></svg>
                      <span>删除</span>
                    </button>
                  </div>
                </div>

                <div class="dropdown-list">
                  <div v-if="getFolderBookmarks(folder.name).length === 0" class="dropdown-empty-hint">
                    暂无书签，可从下方长按拖拽卡片至此
                  </div>

                  <div
                    v-for="bm in getFolderBookmarks(folder.name)"
                    :key="bm.id"
                    class="dropdown-bm-row"
                  >
                    <a :href="bm.url" target="_blank" rel="noopener noreferrer" class="dropdown-bm-item" :title="`点击访问：${bm.title}`">
                      <span class="dropdown-bm-bullet">•</span>
                      <span class="dropdown-bm-name">{{ bm.title }}</span>
                    </a>

                    <button
                      class="btn-remove-from-folder"
                      title="将此书签从该文件夹移出"
                      @click.stop.prevent="handleRemoveBmFromFolder(bm.id, folder.name)"
                    >
                      <svg class="svg-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.close"></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 新建文件夹按钮与输入表单 -->
          <div class="new-folder-box">
            <button
              v-if="!isCreatingFolder"
              class="btn-add-folder"
              title="新建分类文件夹"
              @click="isCreatingFolder = true"
            >
              <svg class="svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.plus"></svg>
              <span>新建文件夹</span>
            </button>

            <div v-else class="new-folder-input-form">
              <input
                v-model="newFolderName"
                type="text"
                placeholder="分类名称..."
                class="new-folder-input"
                autoFocus
                @keydown.enter="submitNewFolder"
                @keydown.esc="isCreatingFolder = false"
              />
              <button class="btn-confirm-add" title="确认添加" @click="submitNewFolder">
                <svg class="svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.check"></svg>
              </button>
              <button class="btn-cancel-add" title="取消" @click="isCreatingFolder = false">
                <svg class="svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.close"></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 仅边缘是雾化效果的水墨过渡层 (固定在吸顶导航底部) -->
      <div class="header-mist-edge"></div>
    </header>

    <!-- 下方主体滚动内容区 (居中最大宽度 1200px) -->
    <main class="bookmarks-main-content">
      <div class="bookmark-grid-container">
        <!-- 当前文件夹激活提示条 (当点击某文件夹时显示) -->
        <div v-if="activeFolder !== 'all'" class="active-folder-header-bar">
          <div class="folder-header-left">
            <span class="current-folder-chip">
              <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.folder"></svg>
              <span>当前文件夹：<strong>{{ activeFolder }}</strong></span>
            </span>
            <span class="folder-stats-text">共 {{ filteredAndSortedBookmarks.length }} 条书签</span>
          </div>

          <div class="folder-header-right">
            <button class="folder-action-pill" title="重命名当前文件夹" @click="startRenameFolder(activeFolder)">
              <svg class="svg-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.edit"></svg>
              <span>重命名</span>
            </button>
            <button class="folder-action-pill btn-danger-pill" title="删除此文件夹" @click="handleDeleteFolder(activeFolder)">
              <svg class="svg-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.trash"></svg>
              <span>删除文件夹</span>
            </button>
            <button class="folder-action-pill btn-view-all" title="查看所有书签" @click="activeFolder = 'all'">
              <span>查看全部书签</span>
            </button>
          </div>
        </div>

        <!-- 重命名文件夹弹窗 (已抽离独立无障碍组件) -->
        <RenameFolderModal
          :is-open="isRenamingFolder"
          :folder-name="folderBeingRenamed"
          @close="isRenamingFolder = false"
          @submit="submitRenameFolderModal"
        />

        <!-- 移动端长按分类浮层 (已抽离独立组件) -->
        <MobileFolderSelectModal
          :is-open="isMobileFolderModalOpen"
          :bookmark-id="selectedMobileBookmark?.id || ''"
          :bookmark-title="selectedMobileBookmark?.title || ''"
          :current-folder="selectedMobileBookmark?.folder"
          :folders="folders"
          @close="isMobileFolderModalOpen = false"
          @assign="handleAssignFolder"
          @create-and-assign="handleCreateAndAssignFolder"
        />

        <!-- 空状态 -->
        <div v-if="filteredAndSortedBookmarks.length === 0" class="empty-state">
          <svg class="svg-icon empty-icon" width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.bookmark"></svg>
          <h3 class="empty-title">暂无相关书签</h3>
          <p class="empty-sub">
            {{ activeFolder !== 'all' ? `分类 [${activeFolder}] 下暂无书签，可从下方长按拖拽卡片至此文件夹归类。` : '在首页输入任意网页链接生成总结后，点击“保存到书签”即可自动沉淀到这里。' }}
          </p>
          <button v-if="activeFolder !== 'all'" class="btn-secondary btn-sm" style="margin-top: 0.75rem;" @click="activeFolder = 'all'">
            返回查看全部书签
          </button>
        </div>

        <!-- 书签网格列表 (组件化 + 分批极速渲染 + 支持桌面拖拽与移动端长按归类) -->
        <div v-else class="cards-grid" :class="[`grid-cols-${columns}`]">
          <BookmarkCard
            v-for="bm in displayedBookmarks"
            :key="bm.id"
            :bookmark="bm"
            :is-editing="editingBookmarkId === bm.id"
            :edit-text="inlineEditText"
            :is-dragging="draggedBookmarkId === bm.id"
            @dragstart="handleDragStart"
            @dragend="handleDragEnd"
            @long-press="handleMobileLongPress"
            @open-mobile-folder-select="handleMobileLongPress"
            @filter-folder="activeFolder = $event"
            @remove-from-folder="handleRemoveBmFromFolder"
            @toggle-pin="togglePin"
            @start-inline-edit="startInlineEdit"
            @cancel-inline-edit="cancelInlineEdit"
            @save-inline-edit="saveInlineEdit"
            @update-edit-text="inlineEditText = $event"
            @delete="handleDelete"
          />
        </div>

        <!-- 海量数据平滑分批展示 (防卡顿) -->
        <div v-if="filteredAndSortedBookmarks.length > displayLimit" class="load-more-box">
          <button type="button" class="btn-secondary btn-sm btn-load-more" @click="displayLimit += 40">
            <span>加载更多书签 (已显示 {{ displayedBookmarks.length }} / 共 {{ filteredAndSortedBookmarks.length }} 条)</span>
          </button>
        </div>
      </div>
    </main>

    <!-- 全局轻量 Toast 提示 -->
    <div v-if="toastMessage" class="toast-notification-pill">
      <span>{{ toastMessage }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import BookmarkCard from '../components/BookmarkCard.vue'
import RenameFolderModal from '../components/RenameFolderModal.vue'
import MobileFolderSelectModal from '../components/MobileFolderSelectModal.vue'
import { useAuth, useBookmarks, useTheme, ICONS, type Bookmark } from './state'

const { logout } = useAuth()
const {
  bookmarks,
  folders,
  activeFolder,
  columns,
  searchQuery,
  filteredAndSortedBookmarks,
  addFolder,
  renameFolder,
  deleteFolder,
  assignBookmarkToFolder,
  removeBookmarkFromFolder,
  getBookmarksInFolder,
  setColumns,
  updateBookmark,
  deleteBookmark,
  togglePin
} = useBookmarks()

// 海量书签平滑分批渲染 (性能优化)
const displayLimit = ref(40)
const displayedBookmarks = computed(() => filteredAndSortedBookmarks.value.slice(0, displayLimit.value))

const { themeMode, cycleTheme } = useTheme()

const currentIconSvg = computed(() => {
  if (themeMode.value === 'dark') return ICONS.moon
  if (themeMode.value === 'light') return ICONS.sun
  return ICONS.monitor
})

const currentLabel = computed(() => {
  if (themeMode.value === 'dark') return '深色'
  if (themeMode.value === 'light') return '浅色'
  return '跟随系统'
})

const toastMessage = ref('')
const showToast = (msg: string) => {
  toastMessage.value = msg
  setTimeout(() => { toastMessage.value = '' }, 2500)
}

const handleLogout = async () => {
  await logout()
  window.location.href = '/login'
}

const handleDelete = (id: string) => {
  deleteBookmark(id)
  showToast('已删除该书签')
}

// 移动端长按分类状态
const isMobileFolderModalOpen = ref(false)
const selectedMobileBookmark = ref<Bookmark | null>(null)

const handleMobileLongPress = (bm: Bookmark) => {
  selectedMobileBookmark.value = bm
  isMobileFolderModalOpen.value = true
}

const handleAssignFolder = ({ bookmarkId, folderName }: { bookmarkId: string; folderName: string }) => {
  if (folderName === 'all') {
    removeBookmarkFromFolder(bookmarkId)
    showToast('已将书签移出所有分类')
  } else {
    assignBookmarkToFolder(bookmarkId, folderName)
    showToast(`已将书签归入 [${folderName}]`)
  }
}

const handleCreateAndAssignFolder = async ({ bookmarkId, newFolderName }: { bookmarkId: string; newFolderName: string }) => {
  await addFolder(newFolderName)
  assignBookmarkToFolder(bookmarkId, newFolderName)
  showToast(`已创建并归入 [${newFolderName}]`)
}

// 文件夹悬停与操作状态
const hoveredFolder = ref<string | null>(null)
let hoverCloseTimer: any = null
const isCreatingFolder = ref(false)
const newFolderName = ref('')
const isRenamingFolder = ref(false)
const folderBeingRenamed = ref('')
const renamedFolderNewName = ref('')

const submitRenameFolderModal = (newName: string) => {
  if (!newName.trim() || newName.trim() === folderBeingRenamed.value) {
    isRenamingFolder.value = false
    return
  }
  renameFolder(folderBeingRenamed.value, newName.trim())
  isRenamingFolder.value = false
  showToast(`文件夹已更名为 [${newName.trim()}]`)
}

const editingBookmarkId = ref<string | null>(null)
const inlineEditText = ref('')
const draggedBookmarkId = ref<string | null>(null)
const dragOverFolder = ref<string | null>(null)

const getFolderBookmarks = (folderName: string) => getBookmarksInFolder(folderName)

const openFolderHover = (folderName: string) => {
  if (hoverCloseTimer) clearTimeout(hoverCloseTimer)
  hoveredFolder.value = folderName
}

const scheduleCloseFolderHover = () => {
  hoverCloseTimer = setTimeout(() => { hoveredFolder.value = null }, 300)
}

const cancelCloseFolderHover = () => {
  if (hoverCloseTimer) clearTimeout(hoverCloseTimer)
}

// 拖拽归类逻辑
const handleDragStart = (e: DragEvent, bm: Bookmark) => {
  draggedBookmarkId.value = bm.id
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', bm.id)
  }
}

const handleDragEnd = () => {
  draggedBookmarkId.value = null
  dragOverFolder.value = null
}

const handleDragOverFolder = (folderName: string) => {
  dragOverFolder.value = folderName
}

const handleDragLeaveFolder = (folderName: string) => {
  if (dragOverFolder.value === folderName) {
    dragOverFolder.value = null
  }
}

const handleDropFolder = (folderName: string) => {
  if (!draggedBookmarkId.value) return
  assignBookmarkToFolder(draggedBookmarkId.value, folderName)
  const targetBm = bookmarks.value.find(b => b.id === draggedBookmarkId.value)
  draggedBookmarkId.value = null
  dragOverFolder.value = null
  showToast(`已将《${targetBm?.title?.slice(0, 12) || '书签'}》归入 [${folderName === 'all' ? '全部' : folderName}]`)
}

const submitNewFolder = () => {
  if (!newFolderName.value.trim()) return
  addFolder(newFolderName.value.trim())
  newFolderName.value = ''
  isCreatingFolder.value = false
  showToast('文件夹已创建')
}

const startRenameFolder = (folderName: string) => {
  folderBeingRenamed.value = folderName
  renamedFolderNewName.value = folderName
  isRenamingFolder.value = true
  hoveredFolder.value = null
}

const submitRenameFolder = () => {
  if (!renamedFolderNewName.value.trim() || renamedFolderNewName.value.trim() === folderBeingRenamed.value) {
    isRenamingFolder.value = false
    return
  }
  renameFolder(folderBeingRenamed.value, renamedFolderNewName.value.trim())
  isRenamingFolder.value = false
  showToast(`文件夹已更名为 [${renamedFolderNewName.value.trim()}]`)
}

const handleDeleteFolder = (folderName: string) => {
  deleteFolder(folderName)
  hoveredFolder.value = null
  showToast(`已删除分类 [${folderName}]`)
}

const handleRemoveBmFromFolder = (bookmarkId: string, folderName: string) => {
  removeBookmarkFromFolder(bookmarkId)
  showToast(`已将该书签从 [${folderName}] 移出`)
}

const startInlineEdit = (bm: Bookmark) => {
  editingBookmarkId.value = bm.id
  inlineEditText.value = bm.summary || bm.description || ''
}

const cancelInlineEdit = () => {
  editingBookmarkId.value = null
  inlineEditText.value = ''
}

const saveInlineEdit = (id: string) => {
  if (!inlineEditText.value.trim()) return
  const target = bookmarks.value.find(b => b.id === id)
  if (target) {
    let updatedTitle = target.title
    const titleMatch = inlineEditText.value.match(/^#\s*🚀?\s*链接总结助手\s*\|\s*(.+)$/m)
    if (titleMatch && titleMatch[1]) updatedTitle = titleMatch[1].trim()
    updateBookmark(id, { ...target, title: updatedTitle, summary: inlineEditText.value.trim() })
    showToast('总结内容已更新')
  }
  editingBookmarkId.value = null
  inlineEditText.value = ''
}

const getCleanTags = (bm: Bookmark): string[] => {
  const list: string[] = []
  if (bm.summary) {
    const match = bm.summary.match(/\*\s*\*\*智能标签\*\*[：:]\s*(.+)/i)
    if (match && match[1]) {
      const tag = match[1].replace(/[`\*]/g, '').trim()
      if (tag && !list.includes(tag)) list.push(tag)
    }
  }
  if (bm.tags && bm.tags.length) {
    for (const t of bm.tags) {
      if (!/AI总结|Defuddle|Jina|智谱|DeepSeek|Gemini|抓取|模型/i.test(t)) {
        if (!list.includes(t)) list.push(t)
      }
    }
  }
  return list
}

const extractOneLiner = (bm: Bookmark): string => {
  if (!bm.summary) return bm.description || ''
  const match = bm.summary.match(/\*\s*\*\*一句话概括\*\*[：:]\s*(.+)/i)
  if (match && match[1]) return match[1].replace(/[`\*]/g, '').trim()
  return bm.description || ''
}

const extractFeatures = (bm: Bookmark): string => {
  if (!bm.summary) return bm.description || ''
  const match = bm.summary.match(/###\s*📕?\s*核心功能说明\s*\n+([\s\S]*?)(?=\n+---|###|🎯|$)/i)
  if (match && match[1]) return match[1].trim()
  return bm.description || ''
}

const extractActions = (bm: Bookmark): string[] => {
  if (!bm.summary) return []
  const match = bm.summary.match(/###\s*🎯?\s*待办行动指南[^\n]*\n+([\s\S]*?)(?=\n+---|###|$)/i)
  if (!match || !match[1]) return []
  return match[1]
    .split('\n')
    .map(line => line.replace(/^[\s\*\-\•]*\[\s*\]\s*/, '').trim())
    .filter(Boolean)
}
</script>

<style scoped>
.bookmarks-page-layout {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-app);
  color: var(--text-main);
  position: relative;
}

/* 顶部吸顶全宽导航栏：100% 宽度无两侧空白，滚动时吸顶常驻不动 */
.sticky-bookmarks-header {
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
  padding-left: 2rem;
  padding-right: 1.75rem;
  font-size: 0.8125rem;
  height: 34px;
  background-color: var(--bg-surface);
  border-radius: var(--radius-full);
  border: 1px solid var(--border-subtle);
  color: var(--text-main);
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
}

.column-switcher {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background-color: var(--bg-surface);
  padding: 0.2rem 0.35rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-xs);
}

.switcher-text {
  font-size: 0.75rem;
  color: var(--text-muted);
  padding-left: 0.35rem;
}

.col-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
  border-radius: var(--radius-full);
  border: none;
  background: transparent;
  cursor: pointer;
}
.col-btn.active {
  background-color: var(--primary);
  color: var(--primary-contrast) !important;
}

.header-right-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.nav-logout-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.38rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-muted);
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
}
.nav-logout-btn:hover {
  color: var(--danger);
  border-color: var(--danger);
  background-color: var(--danger-50);
}

.theme-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.38rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-main);
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
}
.theme-toggle-btn:hover {
  border-color: var(--text-main);
  background-color: var(--bg-surface-hover);
}

.nav-switch-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.38rem 0.85rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--primary-contrast) !important;
  background-color: var(--primary);
  border: 1px solid var(--primary);
  border-radius: var(--radius-full);
  text-decoration: none;
  box-shadow: var(--shadow-sm);
}
.nav-switch-btn:hover {
  background-color: var(--primary-hover);
}

.folders-nav-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  overflow: visible;
  padding-bottom: 0.25rem;
}

.folder-tab-wrapper {
  position: relative;
  display: inline-flex;
}

.folder-tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-muted);
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}
.folder-tab-btn:hover {
  border-color: var(--text-main);
  color: var(--text-main);
}
.folder-tab-btn.active {
  background-color: var(--primary);
  color: var(--primary-contrast) !important;
  border-color: var(--primary);
  font-weight: 600;
}
.folder-tab-btn.is-drag-target {
  border-color: var(--primary);
  background-color: var(--bg-surface-hover);
  transform: scale(1.06);
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.12);
}

.folder-count {
  font-size: 0.75rem;
  opacity: 0.8;
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

/* 下方主体滚动内容区 (1024px ~ 1440px 全屏自适应流式排布，无死板留白) */
.bookmarks-main-content {
  flex: 1;
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 1.25rem 2rem 1.5rem;
}

.bookmark-grid-container {
  width: 100%;
  max-width: 100%;
}

/* 当前激活文件夹提示条 */
.active-folder-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 0.6rem 1rem;
  margin-bottom: 1.25rem;
  box-shadow: var(--shadow-xs);
}

.folder-header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.current-folder-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.875rem;
  color: var(--text-main);
  white-space: nowrap;
}

.folder-stats-text {
  font-size: 0.75rem;
  color: var(--text-muted);
  white-space: nowrap;
}

.folder-header-right {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.folder-action-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.55rem;
  font-size: 0.75rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
  background-color: var(--bg-surface-subtle);
  color: var(--text-muted);
  cursor: pointer;
  white-space: nowrap;
}
.folder-action-pill:hover {
  color: var(--text-main);
  border-color: var(--text-main);
}
.folder-action-pill.btn-danger-pill:hover {
  color: var(--danger);
  border-color: var(--danger);
}
.folder-action-pill.btn-view-all {
  background-color: var(--primary);
  color: var(--primary-contrast) !important;
  border-color: var(--primary);
  font-weight: 500;
}

/* 文件夹悬停预览弹窗 */
.folder-hover-dropdown-bridge {
  position: absolute;
  top: 100%;
  left: 0;
  padding-top: 0.35rem;
  z-index: 120;
}

.folder-hover-dropdown {
  width: 290px;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.dropdown-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid var(--border-subtle);
}

.dropdown-title-group {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.dropdown-folder-title {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--text-main);
}

.dropdown-count-badge {
  font-size: 0.6875rem;
  color: var(--text-muted);
  background-color: var(--bg-surface-subtle);
  padding: 0.1rem 0.4rem;
  border-radius: var(--radius-full);
}

.dropdown-actions-group {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.btn-dropdown-action {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.6875rem;
  padding: 0.15rem 0.35rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background-color: var(--bg-surface-subtle);
  color: var(--text-muted);
  cursor: pointer;
}
.btn-dropdown-action:hover {
  color: var(--text-main);
  border-color: var(--text-main);
}
.btn-dropdown-action.btn-danger-action:hover {
  color: var(--danger);
  border-color: var(--danger);
}

.dropdown-list {
  max-height: 200px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.dropdown-empty-hint {
  font-size: 0.75rem;
  color: var(--text-muted);
  padding: 0.5rem 0.25rem;
  text-align: center;
}

.dropdown-bm-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.3rem 0.4rem;
  border-radius: var(--radius-sm);
  transition: background-color 0.15s ease;
}
.dropdown-bm-row:hover {
  background-color: var(--bg-surface-hover);
}

.dropdown-bm-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  color: var(--text-main);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.dropdown-bm-item:hover {
  color: var(--link-blue);
  text-decoration: underline;
}

.dropdown-bm-bullet {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.btn-remove-from-folder {
  color: var(--text-muted);
  border: none;
  background: transparent;
  padding: 0.1rem 0.3rem;
  font-size: 0.875rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-xs);
}
.btn-remove-from-folder:hover {
  color: var(--danger);
  background-color: var(--danger-50);
}

/* 新建分类输入表单 */
.btn-add-folder {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.35rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
  background-color: transparent;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-full);
  cursor: pointer;
  white-space: nowrap;
}
.btn-add-folder:hover {
  border-color: var(--text-main);
  color: var(--text-main);
}

.new-folder-input-form {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background-color: var(--bg-surface);
  border: 1px solid var(--primary);
  border-radius: var(--radius-full);
  padding: 0.15rem 0.4rem;
}

.new-folder-input {
  border: none !important;
  background: transparent !important;
  font-size: 0.75rem;
  width: 90px;
  padding: 0.2rem 0.25rem;
  color: var(--text-main);
  outline: none;
}

.btn-confirm-add, .btn-cancel-add {
  border: none;
  background: transparent;
  padding: 0.15rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  color: var(--text-muted);
}
.btn-confirm-add:hover { color: var(--text-main); }
.btn-cancel-add:hover { color: var(--danger); }

/* 重命名弹窗 */
.rename-folder-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background-color: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.rename-folder-dialog {
  width: 90%;
  max-width: 380px;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  padding: 1.25rem;
  box-shadow: var(--shadow-2xl);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.dialog-title {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--text-main);
}

.dialog-sub {
  font-size: 0.8125rem;
  color: var(--text-muted);
  margin: 0;
}

.rename-input {
  width: 100%;
  padding: 0.55rem 0.75rem;
  font-size: 0.875rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  background-color: var(--bg-surface-subtle);
  color: var(--text-main);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 4rem 1.5rem;
  background-color: var(--bg-surface);
  border: 1px dashed var(--border-subtle);
  border-radius: var(--radius-xl);
  margin-top: 1rem;
}

.empty-icon {
  color: var(--text-subtle);
  margin-bottom: 0.75rem;
}

.empty-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 0.35rem;
}

.empty-sub {
  font-size: 0.875rem;
  color: var(--text-muted);
  max-width: 480px;
  line-height: 1.6;
}

/* 书签卡片网格 */
.cards-grid {
  display: grid;
  gap: 1.25rem;
}
.grid-cols-1 { grid-template-columns: 1fr; }
.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }

.bm-rich-card {
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  padding: 1.25rem;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  cursor: grab;
  user-select: none;
  transition: all 0.2s ease;
}
.bm-rich-card:active { cursor: grabbing; }
.bm-rich-card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--border-strong);
}
.bm-rich-card.is-pinned {
  border-color: var(--primary);
}
.bm-rich-card.is-dragging {
  opacity: 0.45;
  transform: scale(0.97);
}

.bm-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.bm-title-area {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
  flex: 1;
}

.pinned-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.15rem 0.45rem;
  background-color: var(--primary);
  color: var(--primary-contrast);
  border-radius: var(--radius-full);
}

.card-folder-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 0.15rem 0.45rem;
  background-color: var(--bg-surface-subtle);
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  border-radius: var(--radius-full);
}

.tag-remove-folder-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  padding: 0 0.15rem;
  font-size: 0.75rem;
  cursor: pointer;
}
.tag-remove-folder-btn:hover { color: var(--danger); }

.bm-main-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-main);
  text-decoration: none;
  line-height: 1.4;
}
.bm-main-title:hover {
  text-decoration: underline;
}

.bm-date {
  font-size: 0.75rem;
  color: var(--text-subtle);
  white-space: nowrap;
}

.bm-sub-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.bm-url-link {
  font-size: 0.8125rem;
  color: var(--link-blue);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60%;
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
}
.bm-url-link:hover { text-decoration: underline; }

.bm-actions-group {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.action-pill-btn {
  font-size: 0.6875rem;
  padding: 0.2rem 0.5rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
  background-color: var(--bg-surface-subtle);
  color: var(--text-muted);
  cursor: pointer;
}
.action-pill-btn:hover {
  color: var(--text-main);
  border-color: var(--text-main);
}
.action-pill-btn.active {
  background-color: var(--primary);
  color: var(--primary-contrast);
  border-color: var(--primary);
}
.action-pill-btn.btn-danger-text:hover {
  color: var(--danger);
  border-color: var(--danger);
}

.inline-edit-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.inline-edit-header {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.inline-textarea {
  width: 100%;
  font-family: inherit;
  font-size: 0.8125rem;
  line-height: 1.55;
  padding: 0.65rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background-color: var(--bg-surface-subtle);
  color: var(--text-main);
  resize: vertical;
}

.inline-actions-row {
  display: flex;
  justify-content: flex-end;
  gap: 0.4rem;
}

.bm-summary-body {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  background-color: var(--bg-surface-subtle);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 0.85rem;
}

.summary-badge-header {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--text-main);
}

.summary-meta-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.meta-item-row {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  font-size: 0.8125rem;
}

.meta-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.green-dot {
  background-color: var(--text-main);
}

.meta-label {
  font-weight: 600;
  color: var(--text-muted);
  flex-shrink: 0;
}

.meta-val {
  color: var(--text-main);
}

.tags-pill-list {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.tag-pill {
  font-size: 0.6875rem;
  padding: 0.1rem 0.4rem;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
  color: var(--text-muted);
}

.summary-features-box {
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 0.65rem 0.75rem;
  font-size: 0.8125rem;
}

.features-heading {
  font-weight: 600;
  margin-bottom: 0.35rem;
  color: var(--text-main);
}

.features-content {
  color: var(--text-muted);
  line-height: 1.55;
}

.summary-actions-box {
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 0.65rem 0.75rem;
  font-size: 0.8125rem;
}

.actions-heading {
  font-weight: 600;
  margin-bottom: 0.35rem;
  color: var(--text-main);
}

.actions-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.action-item-row {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  color: var(--text-muted);
}

.action-bullet {
  font-family: monospace;
  font-weight: 700;
}

.bm-summary-empty {
  font-size: 0.8125rem;
  color: var(--text-subtle);
  padding: 0.5rem;
  text-align: center;
}

/* 底部轻量 Toast */
.toast-notification {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--primary);
  color: var(--primary-contrast);
  padding: 0.55rem 1.25rem;
  border-radius: var(--radius-full);
  font-size: 0.8125rem;
  font-weight: 600;
  box-shadow: var(--shadow-xl);
  z-index: 100;
  pointer-events: none;
  animation: toastFade 0.25s ease-out;
}

@keyframes toastFade {
  from { opacity: 0; transform: translate(-50%, 10px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}

/* 1024 尺寸 (大于 768px 且 小于等于 1024px)：使用 1024 的显示方法，不显示一行 3 列的按钮 */
@media (min-width: 769px) and (max-width: 1024px) {
  .header-main-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }
  .header-left-group {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
  }
  .compact-search-box {
    width: 220px;
  }
  .compact-search-box:focus-within {
    width: 280px;
  }
  /* 1024 尺寸不显示一行显示 3 个的按钮 */
  .col-btn-3 {
    display: none !important;
  }
  /* 若当前选中为 3 列，在 1024 尺寸自动适配为 2 列 */
  .grid-cols-3 {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
}

/* 375, 425, 768 尺寸 (小于等于 768px)：
   1. 不显示排布切换器 (图一)
   2. 都只一行显示一个卡片
   3. 图一所在部分换行显示：第1行书签图标与右上角三个按钮对齐，第2行搜索框换行占满整行 */
@media (max-width: 768px) {
  .header-inner-content {
    padding: 0.65rem 0.85rem 0.35rem;
  }

  .header-main-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.65rem 0.5rem;
  }

  .header-left-group {
    display: contents;
  }

  /* 第 1 行左侧：书签图标 */
  .top-left-icon-box {
    order: 1;
  }

  /* 第 1 行右侧：右上角三个按钮 (退出登录 + 切换主题 + 首页)，与书签图标同一行对齐 */
  .header-right-actions {
    order: 2;
    margin-left: auto;
  }

  /* 第 2 行：搜索框换行占满整行 */
  .compact-search-box {
    order: 3;
    width: 100% !important;
    max-width: 100%;
  }

  .compact-search-box:focus-within {
    width: 100% !important;
  }

  /* 375, 425, 768 尺寸都不显示图一 (每行排布切换器) */
  .column-switcher {
    display: none !important;
  }

  /* 375, 425, 768 尺寸都只一行显示一个 */
  .cards-grid,
  .grid-cols-1,
  .grid-cols-2,
  .grid-cols-3 {
    grid-template-columns: 1fr !important;
  }

  .bookmarks-main-content {
    padding: 0.85rem 0.75rem 3rem;
  }
}

/* 375, 425 尺寸专属：
   1. 顶部操作栏三个按钮 (退出登录 + 跟随系统 + 首页) 仅显示图标，不显示文字
   2. 文件夹不需要有悬停窗口 (纯点击切换模式)
   3. 链接和按钮换行显示 (Row 1: 网址链接, Row 2: 三个操作按钮)，避免文字挤压换行
   4. 当前文件夹提示条换行显示 (Row 1: 文件夹信息, Row 2: 三个操作按钮)，文字单行平铺不折叠 */
@media (max-width: 480px) {
  /* 顶部导航按钮：375 和 425 尺寸下仅显示图标，隐藏文字 */
  .header-right-actions .nav-logout-btn span,
  .header-right-actions .theme-toggle-btn span,
  .header-right-actions .nav-switch-btn span {
    display: none !important;
  }

  .header-right-actions .nav-logout-btn,
  .header-right-actions .theme-toggle-btn,
  .header-right-actions .nav-switch-btn {
    padding: 0.42rem !important;
    min-width: 32px;
    height: 32px;
    justify-content: center;
    border-radius: var(--radius-full);
  }

  .header-right-actions {
    gap: 0.35rem !important;
  }

  .folder-hover-dropdown-bridge {
    display: none !important;
  }

  .active-folder-header-bar {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 0.65rem !important;
    padding: 0.75rem 0.85rem !important;
  }

  .folder-header-left {
    width: 100% !important;
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
  }

  .current-folder-chip {
    white-space: nowrap !important;
    font-size: 0.8125rem !important;
  }

  .folder-stats-text {
    white-space: nowrap !important;
    font-size: 0.75rem !important;
  }

  .folder-header-right {
    width: 100% !important;
    display: flex !important;
    flex-wrap: wrap !important;
    align-items: center !important;
    gap: 0.45rem !important;
  }

  .folder-action-pill {
    white-space: nowrap !important;
    padding: 0.25rem 0.55rem !important;
    font-size: 0.75rem !important;
  }

  .bm-sub-row {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 0.55rem !important;
  }

  .bm-url-link {
    max-width: 100% !important;
    width: 100% !important;
  }

  .bm-actions-group {
    width: 100% !important;
    display: flex !important;
    align-items: center !important;
    gap: 0.45rem !important;
  }

  .action-pill-btn {
    white-space: nowrap !important;
    padding: 0.22rem 0.55rem !important;
    font-size: 0.75rem !important;
  }
}

.load-more-box {
  display: flex;
  justify-content: center;
  margin-top: 1.5rem;
}
.btn-load-more {
  padding: 0.5rem 1.25rem;
  border-radius: var(--radius-full);
  font-size: 0.8125rem;
}

/* 全局轻量 Toast 悬浮提示胶囊 */
.toast-notification-pill {
  position: fixed;
  bottom: 2.5rem;
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--primary);
  color: var(--primary-contrast) !important;
  padding: 0.55rem 1.4rem;
  border-radius: var(--radius-full);
  font-size: 0.8125rem;
  font-weight: 600;
  box-shadow: var(--shadow-lg), 0 8px 24px rgba(0, 0, 0, 0.18);
  z-index: 9999;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  pointer-events: none;
  border: 1px solid var(--border-subtle);
  animation: toastFloatUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes toastFloatUp {
  0% {
    opacity: 0;
    transform: translate(-50%, 14px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, 0) scale(1);
  }
}
</style>
