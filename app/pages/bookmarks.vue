<template>
  <div class="bookmarks-page-layout">
    <!-- 顶部全宽常驻吸顶导航栏 (100% 满宽无两侧留白，吸顶固定不动，仅下边缘为水墨雾化模糊) -->
    <header class="sticky-bookmarks-header">
      <div class="header-inner-content">
        <!-- 顶部第一行：左侧 Logo + 搜索 + 列切换；右侧 操作按钮组 -->
        <div class="header-main-row">
          <div class="header-left-group">
            <div class="top-left-icon-box" title="墨萃 · 书签库">
              <SvgIcon name="bookmark" size="20" extra-class="bookmark-header-icon" />
            </div>

            <div class="compact-search-box">
              <SvgIcon name="search" size="15" extra-class="search-icon" />
              <input
                id="bookmark-search-input"
                name="searchQuery"
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
                <SvgIcon name="close" size="12" />
              </button>
            </div>

            <!-- 桌面端列数切换 -->
            <div class="column-switcher" title="切换每行排布数量">
              <span class="switcher-text">每行排布:</span>
              <div class="column-btn-group">
                <button
                  v-for="col in ([1, 2, 3] as const)"
                  :key="col"
                  :class="['col-btn', `col-btn-${col}`, { active: effectiveColumns === col }]"
                  :title="`一行显示 ${col} 个书签`"
                  @click="setColumns(col)"
                >
                  <SvgIcon :name="`grid-${col}`" size="13" />
                  <span>{{ col === 1 ? '1列(详细)' : `${col}列` }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 右上角操作区：批量管理 + 导出 + 退出登录 + 主题切换 + 返回首页 -->
          <div class="header-right-actions">

            <button
              class="nav-action-btn"
              :class="{ active: isSelectMode }"
              title="批量选择与管理书签"
              @click="toggleSelectMode"
            >
              <SvgIcon name="checkSquare" size="13" />
              <span>{{ isSelectMode ? '完成选择' : '批量管理' }}</span>
            </button>


            <button
              class="nav-action-btn"
              title="导出为标准 Netscape HTML 或 Markdown 知识库"
              @click="isExportModalOpen = true"
            >
              <SvgIcon name="download" size="13" />
              <span>导出</span>
            </button>

            <button class="nav-logout-btn" title="退出登录" @click="handleLogout">
              <SvgIcon name="logout" size="14" />
              <span>退出登录</span>
            </button>

            <button class="theme-toggle-btn" :title="`当前主题：${currentLabel} (点击切换)`" @click="cycleTheme">
              <SvgIcon :svg="currentIconSvg" size="14" />
              <span class="theme-label">{{ currentLabel }}</span>
            </button>

            <NuxtLink to="/snapshots" class="nav-switch-btn" title="进入网页快照库 (离线归档)">
              <SvgIcon name="camera" size="14" />
              <span>快照</span>
            </NuxtLink>

            <NuxtLink to="/" class="nav-switch-btn" title="进入首页">
              <SvgIcon name="home" size="14" />
              <span>首页</span>
            </NuxtLink>
          </div>
        </div>

        <!-- 顶部第二行：分类文件夹导航栏 -->
        <div class="folders-nav-row">
          <!-- 全部书签 Tab (支持作为移出到根目录的 Drop Target) -->
          <button
            class="folder-tab-btn root-all-tab"
            :class="{
              active: activeFolder === 'all',
              'is-drag-over-root': dragOverTarget === 'all' && draggedFolderName,
              'is-drag-target': dragOverTarget === 'all' && draggedBookmarkId
            }"
            title="点击查看所有书签。拖拽子文件夹至此可移出至根目录，也可将卡片拖入此移出所有分类"
            @click="activeFolder = 'all'"
            @dragover.prevent="handleFolderDragOver($event, 'all')"
            @dragleave="handleFolderDragLeave($event, 'all')"
            @drop="handleFolderDrop($event, 'all')"
          >
            <SvgIcon name="folder" size="13" />
            <span class="folder-name">全部</span>
            <span class="folder-count">({{ bookmarks.length }})</span>
            <span v-if="dragOverTarget === 'all' && draggedFolderName" class="drag-hint-badge">移出到根目录</span>
          </button>

          <!-- 未分类书签 Tab -->
          <button
            class="folder-tab-btn root-uncategorized-tab"
            :class="{
              active: activeFolder === 'uncategorized',
              'is-drag-target': dragOverTarget === 'uncategorized' && draggedBookmarkId
            }"
            title="点击查看未分类书签。可将卡片拖入此移出所有分类"
            @click="activeFolder = 'uncategorized'"
            @dragover.prevent="handleFolderDragOver($event, 'uncategorized')"
            @dragleave="handleFolderDragLeave($event, 'uncategorized')"
            @drop="handleFolderDrop($event, 'uncategorized')"
          >
            <SvgIcon name="folder" size="13" />
            <span class="folder-name">未分类</span>
            <span class="folder-count">({{ uncategorizedBookmarks.length }})</span>
            <span v-if="dragOverTarget === 'uncategorized' && draggedBookmarkId" class="drag-hint-badge">移至未分类</span>
          </button>

          <!-- 一级分类文件夹 Tabs 列表容器 (使用独立组件隔离各自的 Virtual DOM Block) -->
          <div class="folders-tab-items-wrapper">
            <FolderTabItem
              v-for="folder in topLevelFolders"
              :key="folder.name"
              :folder="folder"
              :is-active="isFolderOrDescendantActive(folder.name)"
              :is-select-mode="isSelectMode"
              :drag-over-target="dragOverTarget"
              :drag-over-position="dragOverPosition"
              :dragged-folder-name="draggedFolderName"
              :dragged-bookmark-id="draggedBookmarkId"
              :cascade-path="cascadePath"
              @select-folder="activeFolder = $event; cascadePath = []"
              @open-cascade="(d, f) => openCascadeLevel(d, f)"
              @cancel-close="cancelCloseCascade"
              @schedule-close="scheduleCloseCascade"
              @move-out="handleMoveOutToRoot"
              @remove-bm="handleRemoveBmFromFolder"
              @drag-start-bm="handleBmDragStart"
              @drag-end-bm="handleBmDragEnd"
              @drag-start="handleFolderDragStart"
              @drag-end="handleFolderDragEnd"
              @drag-over="handleFolderDragOver"
              @drag-leave="handleFolderDragLeave"
              @drop="handleFolderDrop"
            />
          </div>

          <!-- 新建文件夹按钮与输入表单 -->
          <div class="new-folder-box">
            <button
              v-if="!isCreatingFolder"
              class="btn-add-folder"
              title="新建分类文件夹"
              @click="isCreatingFolder = true"
            >
              <SvgIcon name="plus" size="13" />
              <span>新建文件夹</span>
            </button>

            <div v-else class="new-folder-input-form">
              <input
                v-model="newFolderName"
                type="text"
                placeholder="分类名称(支持 父/子)..."
                class="new-folder-input"
                autoFocus
                @keydown.enter="submitNewFolder"
                @keydown.esc="isCreatingFolder = false"
              />
              <button class="btn-confirm-add" title="确认添加" @click="submitNewFolder">
                <SvgIcon name="check" size="13" />
              </button>
              <button class="btn-cancel-add" title="取消" @click="isCreatingFolder = false">
                <SvgIcon name="close" size="13" />
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
        <!-- 多级面包屑与当前文件夹操作条 (当激活文件夹非 'all' 时展示) -->
        <div v-if="activeFolder !== 'all'" class="active-folder-header-bar">
          <div class="folder-header-left">
            <!-- 面包屑导航 (支持点击跳转与拖拽放入/移出) -->
            <nav class="folder-breadcrumbs-trail" aria-label="文件夹层级路径">
              <span
                class="breadcrumb-node breadcrumb-root"
                :class="{ 'is-drop-target': dragOverTarget === 'all' }"
                title="全部书签根目录 (拖拽至此移出至根目录)"
                @click="activeFolder = 'all'"
                @dragover.prevent="handleFolderDragOver($event, 'all')"
                @dragleave="handleFolderDragLeave($event, 'all')"
                @drop="handleFolderDrop($event, 'all')"
              >
                全部
              </span>

              <div class="breadcrumbs-dynamic-trail">
                <span
                  v-for="(crumb, idx) in activeFolderBreadcrumbs"
                  :key="crumb.path"
                  class="breadcrumb-item-wrapper"
                >
                  <span class="breadcrumb-separator">/</span>
                  <span
                    class="breadcrumb-node"
                    :class="{
                      'breadcrumb-current': idx === activeFolderBreadcrumbs.length - 1,
                      'is-drop-target': dragOverTarget === crumb.path
                    }"
                    :title="idx === activeFolderBreadcrumbs.length - 1 ? `当前所在文件夹：${crumb.name}` : `跳转至：${crumb.name} (可拖拽放入此层级)`"
                    @click="activeFolder = crumb.path"
                    @dragover.prevent="handleFolderDragOver($event, crumb.path)"
                    @dragleave="handleFolderDragLeave($event, crumb.path)"
                    @drop="handleFolderDrop($event, crumb.path)"
                  >
                    {{ crumb.name }}
                  </span>
                </span>
              </div>
            </nav>

            <span class="folder-stats-text">共 {{ filteredAndSortedBookmarks.length }} 条书签</span>
          </div>

          <div v-if="activeFolder !== 'uncategorized'" class="folder-header-right">
            <!-- 移动文件夹/加入另一文件夹分类 按钮 (将当前文件夹加入到另一个文件夹或移至根目录) -->
            <button class="folder-action-pill" title="将当前文件夹加入到另一个文件夹或移至根目录" @click="openMoveFolderModal(activeFolder)">
              <SvgIcon name="folder" size="12" />
              <span>分类</span>
            </button>

            <!-- 如果是子文件夹，提供一键移出到根目录 -->
            <button
              v-if="activeFolder.includes('/')"
              class="folder-action-pill btn-move-out"
              title="将此文件夹移出到顶级根目录"
              @click="handleMoveOutToRoot(activeFolder)"
            >
              <SvgIcon name="cornerUpLeft" size="12" />
              <span>移出到根目录</span>
            </button>

            <button class="folder-action-pill" title="重命名当前文件夹" @click="startRenameFolder(activeFolder)">
              <SvgIcon name="edit" size="12" />
              <span>重命名</span>
            </button>
            <button class="folder-action-pill btn-danger-pill" title="删除此文件夹" @click="handleDeleteFolder(activeFolder)">
              <SvgIcon name="trash" size="12" />
              <span>删除文件夹</span>
            </button>
            <button class="folder-action-pill btn-view-all" title="查看所有书签" @click="activeFolder = 'all'">
              <span>查看全部</span>
            </button>
          </div>
          <div v-else class="folder-header-right">
            <button class="folder-action-pill btn-view-all" title="查看所有书签" @click="activeFolder = 'all'">
              <span>查看全部</span>
            </button>
          </div>
        </div>

        <!-- 当前文件夹直属子分类快速导航栏 (如果当前激活文件夹有子文件夹) -->
        <div v-if="activeFolder !== 'all' && activeFolder !== 'uncategorized' && activeDirectSubfolders.length > 0" class="subfolders-quick-nav-bar">
          <div style="display: inline-flex; align-items: center; gap: 0.35rem;">
            <SvgIcon name="folder" size="12" />
            <span class="quick-nav-label">下级子文件夹:</span>
          </div>
          <div class="quick-subfolder-chips">
            <button
              v-for="subf in activeDirectSubfolders"
              :key="subf.name"
              class="quick-subfolder-chip"
              :draggable="!isSelectMode"
              :title="`点击进入 [${getFolderBaseName(subf.name)}]，可拖拽排序或移出`"
              @click="activeFolder = subf.name"
              @dragstart="handleFolderDragStart($event, subf.name)"
              @dragend="handleFolderDragEnd"
              @dragover.prevent="handleFolderDragOver($event, subf.name)"
              @dragleave="handleFolderDragLeave($event, subf.name)"
              @drop="handleFolderDrop($event, subf.name)"
            >
              <SvgIcon name="folder" size="12" />
              <span>{{ getFolderBaseName(subf.name) }}</span>
              <span class="chip-count">({{ getFolderBookmarks(subf.name, true).length }})</span>
            </button>
          </div>
        </div>

        <!-- 重命名文件夹弹窗 (已抽离独立无障碍组件) -->
        <RenameFolderModal
          :is-open="isRenamingFolder"
          :folder-name="folderBeingRenamed"
          :folders="folders"
          @close="isRenamingFolder = false"
          @submit="submitRenameFolderModal"
        />

        <!-- 移动文件夹/归入其他文件夹弹窗 -->
        <MoveFolderModal
          :is-open="isMoveFolderModalOpen"
          :folder-name="folderBeingMoved"
          :folders="folders"
          @close="isMoveFolderModalOpen = false"
          @move-folder="handleMoveFolderModalSubmit"
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

        <!-- 导出书签弹窗 (全量 / 分类 / 勾选导出) -->
        <ExportBookmarkModal
          v-model="isExportModalOpen"
          :all-bookmarks="bookmarks"
          :active-folder="activeFolder"
          :selected-bookmark-ids="selectedBookmarkIds"
          @exported="handleExported"
        />

        <!-- 导入书签弹窗 (直接从书签页一键导入与建分类) -->
        <ExtensionInstallModal
          v-model="isImportModalOpen"
          @import-bookmarks="handleImportFromModal"
        />

        <!-- 核心内容展示区 (空状态 / 书签卡片网格) -->
        <div class="bookmarks-content-area">
          <!-- 空状态 -->
          <div v-if="filteredAndSortedBookmarks.length === 0" class="empty-state">
            <SvgIcon name="bookmark" size="38" extra-class="empty-icon" />
            <h3 class="empty-title">暂无相关书签</h3>
            <p class="empty-sub">
              {{ activeFolder !== 'all' ? `分类 [${activeFolder}] 下暂无书签，可从下方长按拖拽卡片至此文件夹归类。` : '在首页输入任意网页链接生成总结后，点击“保存到书签”即可自动沉淀到这里。' }}
            </p>
            <button v-if="activeFolder !== 'all'" class="btn-secondary btn-sm" style="margin-top: 0.75rem;" @click="activeFolder = 'all'">
              返回查看全部书签
            </button>
          </div>

          <!-- 书签网格列表 (组件化 + 分批极速渲染 + 支持桌面拖拽与移动端长按归类) -->
          <div v-else class="cards-grid-wrapper">
            <div class="cards-grid" :class="[`grid-cols-${effectiveColumns}`]">
              <BookmarkCard
                v-for="bm in displayedBookmarks"
                :key="bm.id"
                :bookmark="bm"
                :is-editing="editingBookmarkId === bm.id"
                :edit-text="inlineEditText"
                :is-dragging="draggedBookmarkId === bm.id"
                :is-select-mode="isSelectMode"
                :is-selected="selectedBookmarkIds.has(bm.id)"
                @dragstart="handleDragStart"
                @dragend="handleDragEnd"
                @long-press="handleMobileLongPress"
                @open-mobile-folder-select="handleMobileLongPress"
                @filter-folder="activeFolder = $event"
                @remove-from-folder="handleRemoveBmFromFolder"
                @toggle-pin="togglePin"
                @toggle-select="toggleSelectBookmark"
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
        </div>
      </div>
    </main>

    <!-- 批量管理底部悬浮操作栏 -->
    <div v-if="isSelectMode" class="floating-bulk-bar">
      <div class="bulk-info-group">
        <span class="bulk-stats">已选 <strong>{{ selectedBookmarkIds.size }}</strong> 项</span>
        <button class="btn-bulk-act" @click="selectAllInCurrentView">
          {{ selectedBookmarkIds.size >= displayedBookmarks.length && displayedBookmarks.length > 0 ? '取消全选' : '全选当前' }}
        </button>
      </div>

      <div class="bulk-actions-group">
        <button class="btn-bulk-act btn-primary-bulk" :disabled="selectedBookmarkIds.size === 0" @click="isExportModalOpen = true">
          <SvgIcon name="download" size="13" />
          <span>导出所选 ({{ selectedBookmarkIds.size }})</span>
        </button>

        <button class="btn-bulk-act btn-danger-bulk" :disabled="selectedBookmarkIds.size === 0" @click="batchDeleteSelected">
          <SvgIcon name="trash" size="13" />
          <span>批量删除</span>
        </button>

        <button class="btn-bulk-act" @click="toggleSelectMode">退出管理</button>
      </div>
    </div>

    <!-- 全局轻量 Toast 提示 -->
    <div v-if="toastMessage" class="toast-notification-pill">
      <span>{{ toastMessage }}</span>
    </div>

    <!-- 系统自动检测与在线升级弹窗 -->
    <UpdateModal />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import SvgIcon from '../components/SvgIcon.vue'
import BookmarkCard from '../components/BookmarkCard.vue'
import FolderTabItem from '../components/FolderTabItem.vue'
import FolderCascadeMenu from '../components/FolderCascadeMenu.vue'
import RenameFolderModal from '../components/RenameFolderModal.vue'
import MoveFolderModal from '../components/MoveFolderModal.vue'
import MobileFolderSelectModal from '../components/MobileFolderSelectModal.vue'
import ExportBookmarkModal from '../components/ExportBookmarkModal.vue'
import ExtensionInstallModal from '../components/ExtensionInstallModal.vue'
import UpdateModal from '../components/UpdateModal.vue'
import { useAuth, useBookmarks, useTheme, ICONS, type Bookmark } from './state'
import { useUpdater } from '../utils/updater'

definePageMeta({
  keepalive: true
})

const { versionInfo, openUpdateModal, checkUpdateSilently } = useUpdater()
const { logout } = useAuth()
const {
  bookmarks,
  folders,
  activeFolder,
  columns,
  searchQuery,
  filteredAndSortedBookmarks,
  uncategorizedBookmarks,
  addFolder,
  renameFolder,
  deleteFolder,
  reorderFolders,
  moveFolder,
  assignBookmarkToFolder,
  removeBookmarkFromFolder,
  getBookmarksInFolder,
  setColumns,
  importBookmarksBatch,
  addBookmark,
  updateBookmark,
  deleteBookmark,
  togglePin
} = useBookmarks()

// 文件夹层级与多级路径计算
const getFolderBaseName = (path: string) => path.split('/').pop() || path
const getFolderParentPath = (path: string) => path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : null

const topLevelFolders = computed(() => {
  return folders.value.filter(f => !f.name.includes('/'))
})

const getDirectSubfolders = (parentPath: string) => {
  const prefix = parentPath + '/'
  return folders.value.filter(f => f.name.startsWith(prefix) && !f.name.slice(prefix.length).includes('/'))
}

// 响应式屏幕断点监听 (1024 尺寸及以下列数自动映射适配)
const isTabletOrBelow = ref(false)
const updateScreenSize = () => {
  if (typeof window !== 'undefined') {
    isTabletOrBelow.value = window.innerWidth <= 1024
  }
}

const effectiveColumns = computed(() => {
  if (isTabletOrBelow.value && columns.value === 3) {
    return 2
  }
  return columns.value
})

const handleDocumentClick = (e: MouseEvent | TouchEvent) => {
  const target = e.target as HTMLElement
  if (target && !target.closest('.folder-tab-wrapper') && !target.closest('.folder-hover-dropdown-bridge')) {
    cascadePath.value = []
  }
}

onMounted(() => {
  updateScreenSize()
  checkUpdateSilently()
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateScreenSize)
    window.addEventListener('pointerdown', handleDocumentClick, { passive: true })
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateScreenSize)
    window.removeEventListener('pointerdown', handleDocumentClick)
  }
})

const isFolderOrDescendantActive = (folderPath: string) => {
  return activeFolder.value === folderPath || activeFolder.value.startsWith(folderPath + '/')
}

const activeFolderBreadcrumbs = computed(() => {
  if (activeFolder.value === 'all') return []
  if (activeFolder.value === 'uncategorized' || activeFolder.value === '未分类') {
    return [{ name: '未分类', path: 'uncategorized' }]
  }
  const segments = activeFolder.value.split('/').map(s => s.trim()).filter(Boolean)
  const crumbs: Array<{ name: string; path: string }> = []
  let current = ''
  for (const seg of segments) {
    current = current ? `${current}/${seg}` : seg
    crumbs.push({ name: seg, path: current })
  }
  return crumbs
})

const activeDirectSubfolders = computed(() => {
  if (activeFolder.value === 'all' || activeFolder.value === 'uncategorized' || activeFolder.value === '未分类') return []
  return getDirectSubfolders(activeFolder.value)
})

// 导出与批量选择状态
const isExportModalOpen = ref(false)
const isImportModalOpen = ref(false)
const isSelectMode = ref(false)
const selectedBookmarkIds = ref<Set<string>>(new Set())

const toggleSelectMode = () => {
  isSelectMode.value = !isSelectMode.value
  if (!isSelectMode.value) {
    selectedBookmarkIds.value.clear()
  }
}

const toggleSelectBookmark = (id: string) => {
  if (selectedBookmarkIds.value.has(id)) {
    selectedBookmarkIds.value.delete(id)
  } else {
    selectedBookmarkIds.value.add(id)
  }
}

const selectAllInCurrentView = () => {
  const allInView = displayedBookmarks.value.map(b => b.id)
  const isAllChosen = allInView.every(id => selectedBookmarkIds.value.has(id))
  if (isAllChosen) {
    allInView.forEach(id => selectedBookmarkIds.value.delete(id))
  } else {
    allInView.forEach(id => selectedBookmarkIds.value.add(id))
  }
}

const batchDeleteSelected = () => {
  const count = selectedBookmarkIds.value.size
  if (count === 0) return
  if (!confirm(`确定要删除选中的 ${count} 条书签吗？`)) return
  selectedBookmarkIds.value.forEach(id => {
    deleteBookmark(id)
  })
  selectedBookmarkIds.value.clear()
  isSelectMode.value = false
  showToast(`已批量删除 ${count} 条书签`)
}

const handleExported = (count: number, wasDeleted = false) => {
  if (wasDeleted) {
    showToast(`已成功导出并从书签库中删除 ${count} 条书签`)
  } else {
    showToast(`已成功导出 ${count} 条书签`)
  }
  if (isSelectMode.value) {
    isSelectMode.value = false
    selectedBookmarkIds.value.clear()
  }
}

const handleImportFromModal = async (items: any[]) => {
  const res = await importBookmarksBatch(items)
  showToast(`已成功批量导入 ${res.count} 条书签并自动归类！`)
}

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

// 文件夹多级递归级联悬停路径与状态 (支持理论无限级嵌套)
const cascadePath = ref<string[]>([])
let cascadeCloseTimer: any = null

const openCascadeLevel = (depth: number, folderName: string) => {
  if (cascadeCloseTimer) clearTimeout(cascadeCloseTimer)
  const next = cascadePath.value.slice(0, depth)
  next[depth] = folderName
  cascadePath.value = next
}

const scheduleCloseCascade = () => {
  if (cascadeCloseTimer) clearTimeout(cascadeCloseTimer)
  cascadeCloseTimer = setTimeout(() => {
    cascadePath.value = []
  }, 450)
}

const cancelCloseCascade = () => {
  if (cascadeCloseTimer) clearTimeout(cascadeCloseTimer)
}

const isCreatingFolder = ref(false)
const newFolderName = ref('')
const isRenamingFolder = ref(false)
const folderBeingRenamed = ref('')
const renamedFolderNewName = ref('')

const isMoveFolderModalOpen = ref(false)
const folderBeingMoved = ref('')

const openMoveFolderModal = (folderName: string) => {
  folderBeingMoved.value = folderName
  isMoveFolderModalOpen.value = true
}

const handleMoveFolderModalSubmit = async ({ folderName, targetParent }: { folderName: string; targetParent: string | null }) => {
  const baseName = getFolderBaseName(folderName)
  const success = await moveFolder(folderName, targetParent)
  isMoveFolderModalOpen.value = false
  if (success !== false) {
    const newPath = targetParent ? `${targetParent}/${baseName}` : baseName
    activeFolder.value = newPath
    showToast(`已将文件夹 [${baseName}] 归入 [${targetParent || '顶级根目录'}]`)
  } else {
    showToast(`移动文件夹失败`)
  }
}


const editingBookmarkId = ref<string | null>(null)
const inlineEditText = ref('')
const draggedBookmarkId = ref<string | null>(null)

// 文件夹拖拽状态 (同级调序 / 放入子级 / 移出根目录)
const draggedFolderName = ref<string | null>(null)
const dragOverTarget = ref<string | null>(null)
const dragOverPosition = ref<'before' | 'after' | 'inside' | null>(null)

const getFolderBookmarks = (folderName: string, includeSubfolders = false) => getBookmarksInFolder(folderName, includeSubfolders)

// 浮窗内与卡片内书签拖拽统一处理器
const handleBmDragStart = (e: DragEvent, bmId: string) => {
  draggedBookmarkId.value = bmId
  draggedFolderName.value = null
  if (cascadeCloseTimer) clearTimeout(cascadeCloseTimer)
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/inkgist-type', 'bookmark')
    e.dataTransfer.setData('text/plain', bmId)
  }
}

const handleBmDragEnd = () => {
  draggedBookmarkId.value = null
  dragOverTarget.value = null
  dragOverPosition.value = null
  scheduleCloseCascade()
}

// 文件夹与书签拖拽逻辑
const handleFolderDragStart = (e: DragEvent, folderName: string) => {
  draggedFolderName.value = folderName
  draggedBookmarkId.value = null
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/inkgist-type', 'folder')
    e.dataTransfer.setData('text/plain', folderName)
  }
}

const handleFolderDragEnd = () => {
  draggedFolderName.value = null
  dragOverTarget.value = null
  dragOverPosition.value = null
  scheduleCloseCascade()
}

const handleFolderDragOver = (e: DragEvent, targetName: string) => {
  // 1. 拖拽文件夹 (支持拖拽中心放入子级，拖拽边缘调序，并自动展开目标文件夹的级联预览以便选择放入具体子目录)
  if (draggedFolderName.value) {
    const src = draggedFolderName.value
    if (targetName === src) return
    if (targetName !== 'all' && (targetName.startsWith(src + '/') || targetName === src)) {
      return
    }
    e.preventDefault()
    e.stopPropagation()

    if (targetName === 'all') {
      dragOverTarget.value = 'all'
      dragOverPosition.value = 'inside'
      return
    }

    const el = e.currentTarget as HTMLElement
    const rect = el.getBoundingClientRect()
    const relX = e.clientX - rect.left
    const ratio = rect.width > 0 ? relX / rect.width : 0.5

    // 带滞回滤波的区域判定，防止边缘抖动与高频闪烁 (Anti-jitter deadband)
    const isCurrentTarget = dragOverTarget.value === targetName
    const currentPos = isCurrentTarget ? dragOverPosition.value : null

    if (currentPos === 'before') {
      if (ratio > 0.25) {
        dragOverPosition.value = ratio > 0.75 ? 'after' : 'inside'
      }
    } else if (currentPos === 'after') {
      if (ratio < 0.75) {
        dragOverPosition.value = ratio < 0.25 ? 'before' : 'inside'
      }
    } else {
      // 当前是 inside 或初次进入
      if (ratio < 0.20) {
        dragOverPosition.value = 'before'
      } else if (ratio > 0.80) {
        dragOverPosition.value = 'after'
      } else {
        dragOverPosition.value = 'inside'
      }
    }

    dragOverTarget.value = targetName

    // 拖拽文件夹在目标分类上方悬停时，自动展开该分类的多级级联预览框
    if (targetName !== 'all') {
      const parts = targetName.split('/')
      const fullPathChain: string[] = []
      let cur = ''
      for (const p of parts) {
        cur = cur ? `${cur}/${p}` : p
        fullPathChain.push(cur)
      }
      cascadePath.value = fullPathChain
      if (cascadeCloseTimer) clearTimeout(cascadeCloseTimer)
    }
    return
  }

  // 2. 拖拽书签卡片 (拖到文件夹或任意子文件夹上时，自动触发多级悬停展开与放置高亮)
  if (draggedBookmarkId.value) {
    e.preventDefault()
    e.stopPropagation()
    dragOverTarget.value = targetName
    dragOverPosition.value = 'inside'

    // 拖拽书签悬停时，自动展开对应的多级预览链条
    if (targetName !== 'all') {
      const parts = targetName.split('/')
      const fullPathChain: string[] = []
      let cur = ''
      for (const p of parts) {
        cur = cur ? `${cur}/${p}` : p
        fullPathChain.push(cur)
      }
      cascadePath.value = fullPathChain
      if (cascadeCloseTimer) clearTimeout(cascadeCloseTimer)
    }
  }
}

const handleFolderDragLeave = (e: DragEvent, targetName: string) => {
  const currentTarget = e.currentTarget as HTMLElement
  const relatedTarget = e.relatedTarget as HTMLElement
  if (currentTarget && relatedTarget && currentTarget.contains(relatedTarget)) {
    return
  }
  if (dragOverTarget.value === targetName) {
    dragOverTarget.value = null
    dragOverPosition.value = null
  }
}

const handleFolderDrop = async (e: DragEvent, targetName: string) => {
  e.preventDefault()
  e.stopPropagation()
  cascadePath.value = []

  // 1. 书签放置归类 (支持放入任意深度的文件夹或子文件夹，或未分类/全部)
  if (draggedBookmarkId.value) {
    const bId = draggedBookmarkId.value
    assignBookmarkToFolder(bId, targetName)
    const targetBm = bookmarks.value.find(b => b.id === bId)
    draggedBookmarkId.value = null
    dragOverTarget.value = null
    dragOverPosition.value = null
    const label = (targetName === 'all' || targetName === 'uncategorized' || targetName === '未分类') ? (targetName === 'all' ? '全部' : '未分类') : targetName
    showToast(`已将《${targetBm?.title?.slice(0, 12) || '书签'}》归入 [${label}]`)
    return
  }

  // 2. 文件夹放置 (排序 / 放入 / 移出)
  if (draggedFolderName.value) {
    const src = draggedFolderName.value
    const pos = dragOverPosition.value
    draggedFolderName.value = null
    dragOverTarget.value = null
    dragOverPosition.value = null

    if (!src || src === targetName) return

    // 拖入 'all' 根目录 或 'uncategorized' -> 移出到根目录
    if (targetName === 'all' || targetName === 'uncategorized') {
      if (src.includes('/')) {
        await moveFolder(src, null)
        showToast(`已将文件夹 [${getFolderBaseName(src)}] 移出到根目录`)
      }
      return
    }

    // 放入目标文件夹成为子文件夹
    if (pos === 'inside') {
      const success = await moveFolder(src, targetName)
      if (success) {
        showToast(`已将 [${getFolderBaseName(src)}] 放入 [${targetName}] 成为子文件夹`)
      }
      return
    }

    // 前插或后插调整顺序
    if (pos === 'before' || pos === 'after') {
      const srcParent = getFolderParentPath(src)
      const targetParent = getFolderParentPath(targetName)

      let effectiveSrc = src
      if (srcParent !== targetParent) {
        await moveFolder(src, targetParent)
        const baseName = getFolderBaseName(src)
        effectiveSrc = targetParent ? `${targetParent}/${baseName}` : baseName
      }

      const currentList = [...folders.value]
      const srcIndex = currentList.findIndex(f => f.name === effectiveSrc)
      if (srcIndex !== -1) {
        const [item] = currentList.splice(srcIndex, 1)
        const targetIndex = currentList.findIndex(f => f.name === targetName)
        if (targetIndex !== -1) {
          const insertIndex = pos === 'before' ? targetIndex : targetIndex + 1
          currentList.splice(insertIndex, 0, item)
          await reorderFolders(currentList)
          showToast(`已调整文件夹 [${getFolderBaseName(effectiveSrc)}] 的排序位置`)
        }
      }
    }
  }
}

const handleMoveOutToRoot = async (folderName: string) => {
  if (!folderName.includes('/')) return
  await moveFolder(folderName, null)
  cascadePath.value = []
  showToast(`已将 [${getFolderBaseName(folderName)}] 移出到根目录`)
}

// 书签卡片拖拽开始与结束
const handleDragStart = (e: DragEvent, bm: Bookmark) => {
  draggedBookmarkId.value = bm.id
  draggedFolderName.value = null
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/inkgist-type', 'bookmark')
    e.dataTransfer.setData('text/plain', bm.id)
  }
}

const handleDragEnd = () => {
  draggedBookmarkId.value = null
  dragOverTarget.value = null
  dragOverPosition.value = null
  scheduleCloseCascade()
}

const submitNewFolder = async () => {
  const name = newFolderName.value.trim()
  if (!name) return
  const lower = name.toLowerCase()
  if (lower === 'all' || lower === 'uncategorized' || name === '全部' || name === '未分类') {
    showToast('不能创建系统保留名称的文件夹')
    return
  }
  if (folders.value.some(f => f.name.toLowerCase() === lower)) {
    showToast(`已存在名为 [${name}] 的文件夹，请勿重复创建`)
    return
  }
  const success = await addFolder(name)
  if (success === false) {
    showToast(`文件夹 [${name}] 创建失败或已存在`)
    return
  }
  newFolderName.value = ''
  isCreatingFolder.value = false
  showToast(`已成功创建文件夹 [${name}]`)
}

const startRenameFolder = (folderName: string) => {
  folderBeingRenamed.value = folderName
  renamedFolderNewName.value = folderName
  isRenamingFolder.value = true
  hoveredFolder.value = null
  hoveredSubfolder.value = null
}

const submitRenameFolder = async () => {
  const trimmed = renamedFolderNewName.value.trim()
  if (!trimmed || trimmed === folderBeingRenamed.value) {
    isRenamingFolder.value = false
    return
  }
  const lower = trimmed.toLowerCase()
  if (lower === 'all' || lower === 'uncategorized' || trimmed === '全部' || trimmed === '未分类') {
    showToast('不能使用系统保留名称')
    return
  }
  if (folders.value.some(f => f.name.toLowerCase() === lower && f.name !== folderBeingRenamed.value)) {
    showToast(`已存在名为 [${trimmed}] 的文件夹，不能重复`)
    return
  }
  const success = await renameFolder(folderBeingRenamed.value, trimmed)
  isRenamingFolder.value = false
  if (success !== false) {
    showToast(`文件夹已更名为 [${trimmed}]`)
  } else {
    showToast(`更名失败，已存在同名文件夹`)
  }
}

const submitRenameFolderModal = async (newName: string) => {
  const trimmed = newName.trim()
  if (!trimmed || trimmed === folderBeingRenamed.value) {
    isRenamingFolder.value = false
    return
  }
  const lower = trimmed.toLowerCase()
  if (lower === 'all' || lower === 'uncategorized' || trimmed === '全部' || trimmed === '未分类') {
    showToast('不能使用系统保留名称')
    return
  }
  if (folders.value.some(f => f.name.toLowerCase() === lower && f.name !== folderBeingRenamed.value)) {
    showToast(`已存在名为 [${trimmed}] 的文件夹，不能重复`)
    return
  }
  const success = await renameFolder(folderBeingRenamed.value, trimmed)
  isRenamingFolder.value = false
  if (success !== false) {
    showToast(`文件夹已更名为 [${trimmed}]`)
  } else {
    showToast(`更名失败，已存在同名文件夹`)
  }
}

const handleDeleteFolder = (folderName: string) => {
  deleteFolder(folderName)
  hoveredFolder.value = null
  hoveredSubfolder.value = null
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
  justify-content: center;
  gap: 0.3rem;
  padding: 0 0.55rem;
  height: 26px;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
  border-radius: var(--radius-full);
  border: none;
  background: transparent;
  cursor: pointer;
  line-height: 1;
}
.col-btn .svg-icon {
  display: inline-block;
  flex-shrink: 0;
  vertical-align: middle;
}
.col-btn span {
  display: inline-flex;
  align-items: center;
  line-height: 1;
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

.nav-logout-btn,
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
}

.nav-logout-btn .svg-icon,
.theme-toggle-btn .svg-icon,
.nav-switch-btn .svg-icon {
  display: inline-block;
  flex-shrink: 0;
  vertical-align: middle;
}

.nav-logout-btn span,
.theme-toggle-btn span,
.nav-switch-btn span {
  display: inline-flex;
  align-items: center;
  line-height: 1;
}

.nav-logout-btn {
  color: var(--text-muted);
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
}
.nav-logout-btn:hover {
  color: var(--danger);
  border-color: var(--danger);
  background-color: var(--danger-50);
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
  text-decoration: none;
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
  width: 100%;
}

.folders-tab-items-wrapper {
  display: contents;
}

.folder-tab-wrapper {
  position: relative;
  display: inline-flex;
}

.folder-tab-wrapper.is-dragging-self {
  opacity: 0.45;
}

.folder-tab-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.38rem 0.8rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-muted);
  background-color: var(--bg-surface-subtle);
  border: none;
  border-radius: var(--radius-full);
  cursor: grab;
  white-space: nowrap;
  transition: background-color 0.15s ease, color 0.15s ease;
  user-select: none;
}
.folder-tab-btn * {
  pointer-events: none;
}
.folder-tab-btn:active {
  cursor: grabbing;
}
.folder-tab-btn:hover {
  background-color: var(--bg-surface-hover);
  color: var(--text-main);
}
.folder-tab-btn.active {
  background-color: var(--primary);
  color: var(--primary-contrast) !important;
  font-weight: 600;
}

/* 放入子文件夹中心高亮 (Nest Inside) - 纯背景柔光高亮，无任何边框与线框 */
.folder-tab-wrapper.is-drag-over-inside .folder-tab-btn,
.folder-tab-btn.is-drag-target {
  background-color: var(--bg-surface-hover) !important;
  color: var(--primary) !important;
}

/* 移出到根目录高亮 (Root All Tab) */
.folder-tab-btn.root-all-tab.is-drag-over-root {
  background-color: rgba(16, 185, 129, 0.2) !important;
  color: #10b981 !important;
}

.subfolder-indicator {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--primary);
  background-color: var(--bg-surface-subtle);
  padding: 0.1rem 0.35rem;
  border-radius: var(--radius-full);
  margin-left: -0.1rem;
}
.folder-tab-btn.active .subfolder-indicator {
  color: var(--primary-contrast);
  background-color: rgba(255, 255, 255, 0.25);
}

/* 浮动提示徽标，绝对定位脱离文档流，杜绝改变按钮宽度造成死循环抖动 */
.drag-hint-badge {
  position: absolute;
  top: -24px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.65rem;
  padding: 0.12rem 0.45rem;
  border-radius: var(--radius-full);
  background-color: var(--primary);
  color: var(--primary-contrast);
  font-weight: 600;
  box-shadow: var(--shadow-md);
  white-space: nowrap;
  pointer-events: none;
  z-index: 50;
  animation: fadeInBadge 0.15s ease;
}

@keyframes fadeInBadge {
  from { opacity: 0; transform: translate(-50%, 4px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}

.folder-count {
  font-size: 0.75rem;
  opacity: 0.8;
}

/* 文件夹悬停多级预览弹窗桥接容器 (绝对定位，紧贴 Tab 底部) */
.folder-hover-dropdown-bridge {
  position: absolute;
  top: 100%;
  left: 0;
  padding-top: 0.35rem;
  z-index: 120;
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

/* 当前激活文件夹面包屑与操作条 */
.active-folder-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 0.65rem 1.15rem;
  margin-bottom: 0.85rem;
  box-shadow: var(--shadow-xs);
  flex-wrap: wrap;
  gap: 0.75rem;
}

.folder-header-left {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  flex-wrap: wrap;
}

/* 面包屑导航样式 (支持点击与拖拽放置) */
.folder-breadcrumbs-trail {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background-color: var(--bg-surface-subtle);
  padding: 0.25rem 0.65rem;
  border-radius: var(--radius-full);
  border: 1px solid var(--border-subtle);
}

.breadcrumb-node {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.15rem 0.4rem;
  border-radius: var(--radius-sm);
  transition: all 0.15s ease;
}
.breadcrumb-node:hover {
  color: var(--primary);
  background-color: var(--bg-surface-hover);
}
.breadcrumb-node.breadcrumb-root {
  font-weight: 600;
}
.breadcrumb-node.breadcrumb-current {
  color: var(--text-main);
  font-weight: 700;
  cursor: default;
}
.breadcrumb-node.is-drop-target {
  background-color: var(--primary-50);
  color: var(--primary);
  outline: 2px dashed var(--primary);
}

.breadcrumb-separator {
  font-size: 0.75rem;
  color: var(--text-subtle);
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
  transition: all 0.15s ease;
}
.folder-action-pill:hover {
  color: var(--text-main);
  border-color: var(--text-main);
}
.folder-action-pill.btn-move-out {
  color: var(--primary);
  border-color: var(--border-strong);
  font-weight: 500;
}
.folder-action-pill.btn-move-out:hover {
  background-color: var(--primary-50);
  border-color: var(--primary);
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

/* 当前文件夹下级子分类快速导航栏 */
.subfolders-quick-nav-bar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.4rem 0.85rem;
  background-color: var(--bg-surface-subtle);
  border: 1px dashed var(--border-subtle);
  border-radius: var(--radius-md);
  margin-bottom: 1.15rem;
  overflow-x: auto;
}

.quick-nav-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  white-space: nowrap;
}

.quick-subfolder-chips {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.quick-subfolder-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.55rem;
  font-size: 0.75rem;
  color: var(--text-main);
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
  cursor: grab;
  white-space: nowrap;
  transition: all 0.15s ease;
}
.quick-subfolder-chip:hover {
  border-color: var(--primary);
  color: var(--primary);
  transform: translateY(-1px);
}
.quick-subfolder-chip .chip-count {
  font-size: 0.6875rem;
  color: var(--text-muted);
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
  min-width: 320px;
  max-width: 380px;
  width: max-content;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  padding: 0.75rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

/* 文件夹中子文件夹展示与二级级联预览 */
.dropdown-subfolders-section {
  padding-bottom: 0.45rem;
  border-bottom: 1px dashed var(--border-subtle);
}

.subfolders-header-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--text-muted);
  margin-bottom: 0.35rem;
}

.subfolder-preview-tip {
  font-size: 0.625rem;
  color: var(--text-subtle);
  font-weight: normal;
}

.subfolders-pills-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.subfolder-pill-wrapper {
  position: relative;
}

.subfolder-pill {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.35rem 0.55rem;
  border-radius: var(--radius-sm);
  background-color: var(--bg-surface-subtle);
  border: 1px solid var(--border-subtle);
  font-size: 0.75rem;
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.15s ease;
}
.subfolder-pill:hover,
.subfolder-pill.is-active-sub {
  background-color: var(--bg-surface-hover);
  border-color: var(--primary);
  color: var(--primary);
}

.subfolder-pill-name {
  font-weight: 600;
  margin-right: 0.25rem;
}
.subfolder-pill-count {
  font-size: 0.6875rem;
  color: var(--text-muted);
  margin-right: auto;
  padding-left: 0.25rem;
}
.subfolder-arrow-indicator {
  font-size: 0.8125rem;
  color: var(--text-subtle);
}

/* 二级子文件夹级联悬停预览弹窗 (Cascading Preview Flyout) */
.subfolder-cascade-flyout {
  position: absolute;
  left: 100%;
  top: -10px;
  padding-left: 0.5rem;
  z-index: 130;
}

.cascade-preview-box {
  min-width: 280px;
  max-width: 340px;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-2xl);
  padding: 0.65rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.cascade-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.35rem;
  border-bottom: 1px solid var(--border-subtle);
  gap: 0.5rem;
}

.cascade-title-row {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  min-width: 0;
}
.cascade-title {
  font-size: 0.75rem;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cascade-path {
  font-size: 0.625rem;
  color: var(--text-subtle);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 90px;
}

.cascade-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

.btn-cascade-act {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.625rem;
  padding: 0.15rem 0.4rem;
  border-radius: var(--radius-xs);
  border: 1px solid var(--border-subtle);
  background-color: var(--bg-surface-subtle);
  color: var(--text-muted);
  cursor: pointer;
  white-space: nowrap;
}
.btn-cascade-act:hover {
  color: var(--text-main);
  border-color: var(--text-main);
}
.btn-cascade-act.btn-cascade-enter {
  background-color: var(--primary);
  color: var(--primary-contrast);
  border-color: var(--primary);
  font-weight: 600;
}

.cascade-bm-list {
  max-height: 180px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.cascade-empty {
  font-size: 0.6875rem;
  color: var(--text-subtle);
  text-align: center;
  padding: 0.5rem 0;
}

.cascade-bm-item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.25rem 0.35rem;
  border-radius: var(--radius-xs);
  font-size: 0.6875rem;
}
.cascade-bm-item-row:hover {
  background-color: var(--bg-surface-hover);
}

.cascade-bm-link {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--text-main);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.cascade-bm-link:hover {
  color: var(--link-blue);
  text-decoration: underline;
}
.cascade-bullet {
  color: var(--text-subtle);
}
.cascade-bm-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding-bottom: 0.45rem;
  border-bottom: 1px solid var(--border-subtle);
  white-space: nowrap;
}

.dropdown-title-group {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
  flex: 1 1 auto;
  white-space: nowrap;
}

.dropdown-folder-title {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--text-main);
  white-space: nowrap;
  word-break: keep-all;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
}

.dropdown-count-badge {
  font-size: 0.6875rem;
  color: var(--text-muted);
  background-color: var(--bg-surface-subtle);
  padding: 0.12rem 0.45rem;
  border-radius: var(--radius-full);
  white-space: nowrap;
  word-break: keep-all;
  flex-shrink: 0;
}

.dropdown-actions-group {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
  white-space: nowrap;
}

.btn-dropdown-action {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  padding: 0.2rem 0.45rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background-color: var(--bg-surface-subtle);
  color: var(--text-muted);
  cursor: pointer;
  white-space: nowrap;
  word-break: keep-all;
  flex-shrink: 0;
}
.btn-dropdown-action span {
  white-space: nowrap !important;
  word-break: keep-all !important;
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
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
.grid-cols-1 { grid-template-columns: minmax(0, 1fr) !important; }
.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
.grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }

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

/* 1024 尺寸 (大于 768px 且 小于等于 1024px)：
   第 1 行：左侧 Logo 图标，右侧 操作功能按钮群；
   第 2 行：左侧 搜索输入框充分向右拉伸充满，右侧 直接贴紧切换按钮左侧 (中间绝无多余空白，切换按钮稳定在最右侧) */
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

  /* 第 2 行左侧：长搜索框 (从第二行开始充分拉伸充满，右侧直接紧贴切换按钮左侧) */
  .compact-search-box {
    order: 3 !important;
    flex: 1 1 calc(100% - 240px) !important;
    min-width: 200px !important;
    max-width: none !important;
    width: auto !important;
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
    width: auto !important;
    flex: 1 1 calc(100% - 240px) !important;
  }

  /* 第 2 行右侧：每行排布切换按钮 (位置在第二行最右侧，紧邻搜索框右边，中间绝不留空) */
  .column-switcher {
    order: 4 !important;
    flex: 0 0 auto !important;
    display: inline-flex !important;
    white-space: nowrap !important;
    flex-shrink: 0 !important;
    margin: 0 !important;
  }

  .switcher-text {
    white-space: nowrap !important;
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

/* 375, 425, 768 及所有移动端/小屏尺寸 (小于等于 768px)：
   1. 第 1 行：左侧 Logo 图标，右侧 5 个操作按钮 (纯图标模式，严密对齐锁定在第一行，绝不折行)
   2. 第 2 行：搜索框独立占满整行 (100% 宽度)
   3. 列数切换器隐藏，卡片一律单列全宽整齐平铺
   4. 文件夹纯点击切换，隐藏悬停浮窗 */
@media (max-width: 768px) {
  .sticky-bookmarks-header {
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

  /* 第 1 行左侧：书签图标 */
  .top-left-icon-box {
    order: 1 !important;
    flex: 0 0 auto !important;
  }

  /* 第 1 行右侧：右上角操作按钮群 (纯图标模式，绝无文字折行溢出) */
  .header-right-actions {
    order: 2 !important;
    margin-left: auto !important;
    flex: 0 0 auto !important;
    display: inline-flex !important;
    align-items: center !important;
    gap: 0.3rem !important;
    flex-wrap: nowrap !important;
  }

  /* 768 尺寸下：前两个按钮（批量管理、导出）为紧凑纯图标，退出登录、主题切换与首页按钮均保留完整文字与图标 */
  .header-right-actions .nav-action-btn span:not(.svg-icon-wrap) {
    display: none !important;
  }

  .header-right-actions .svg-icon-wrap {
    display: inline-flex !important;
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

  .header-right-actions .nav-logout-btn,
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

  .header-right-actions .nav-logout-btn span,
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

  /* 768px 以下不显示列数切换器 */
  .column-switcher {
    display: none !important;
  }

  /* 768px 以下卡片单列全宽显示，以屏幕视口尺寸为准，绝不超出外侧 */
  .cards-grid,
  .grid-cols-1,
  .grid-cols-2,
  .grid-cols-3 {
    grid-template-columns: minmax(0, 1fr) !important;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    box-sizing: border-box !important;
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

  .bookmarks-main-content {
    padding: 0.85rem 1rem 3rem !important;
    box-sizing: border-box !important;
    width: 100% !important;
    max-width: 100% !important;
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

/* 640px 及以下移动端尺寸 (425px, 375px)：所有 5 个按钮统一收缩为极简纯图标模式，严防折行 */
@media (max-width: 640px) {
  .header-right-actions .nav-logout-btn span:not(.svg-icon-wrap),
  .header-right-actions .theme-toggle-btn span:not(.svg-icon-wrap),
  .header-right-actions .nav-switch-btn span:not(.svg-icon-wrap) {
    display: none !important;
  }

  .header-right-actions .nav-logout-btn,
  .header-right-actions .theme-toggle-btn,
  .header-right-actions .nav-switch-btn {
    padding: 0 !important;
    width: 32px !important;
    min-width: 32px !important;
    max-width: 32px !important;
    height: 32px !important;
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

/* 顶部操作栏功能按钮 */
.nav-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  height: 32px;
  padding: 0 0.75rem;
  border-radius: var(--radius-full);
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-main);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  line-height: 1;
  box-sizing: border-box;
}
.nav-action-btn .svg-icon {
  display: inline-block;
  flex-shrink: 0;
  vertical-align: middle;
}
.nav-action-btn span {
  display: inline-flex;
  align-items: center;
  line-height: 1;
}
.nav-action-btn:hover {
  background-color: var(--bg-surface-hover);
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

/* 底部悬浮批量管理栏 */
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
  gap: 0.3rem;
  padding: 0.3rem 0.75rem;
  border-radius: var(--radius-full);
  font-size: 0.775rem;
  font-weight: 500;
  background-color: var(--bg-surface-subtle);
  border: 1px solid var(--border-subtle);
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.15s;
}
.btn-bulk-act:hover:not(:disabled) {
  background-color: var(--bg-surface-hover);
  border-color: var(--border-strong);
}
.btn-bulk-act:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn-primary-bulk {
  background-color: var(--primary) !important;
  color: var(--primary-contrast) !important;
  border-color: var(--primary) !important;
}

.btn-primary-bulk:hover:not(:disabled) {
  background-color: #334155 !important;
  color: #ffffff !important;
  border-color: #334155 !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.btn-danger-bulk:hover:not(:disabled) {
  background-color: rgba(239, 68, 68, 0.12) !important;
  color: var(--danger) !important;
  border-color: var(--danger) !important;
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
