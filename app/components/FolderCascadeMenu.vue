<template>
  <div class="folder-cascade-card" :class="`depth-level-${depth}`">
    <!-- 头部：文件夹名称、书签数量与快捷操作 -->
    <div class="cascade-header">
      <div class="cascade-title-row" :title="`完整路径：${folderName}`">
        <SvgIcon name="folder" size="13" />
        <strong class="cascade-title">{{ getFolderBaseName(folderName) }}</strong>
        <span class="cascade-count-tag">{{ getFolderBookmarks(folderName, true).length }} 项</span>
      </div>

      <div class="cascade-actions">
        <!-- 如果是子层级，支持一键移出到根目录 -->
        <button
          v-if="folderName.includes('/')"
          class="btn-cascade-act"
          title="将此子文件夹移出到顶级根目录"
          @click.stop="$emit('move-out', folderName)"
        >
          <SvgIcon name="cornerUpLeft" size="10" />
          <span>移出</span>
        </button>

        <button
          class="btn-cascade-act btn-cascade-enter"
          title="直接进入浏览此文件夹"
          @click.stop="$emit('select-folder', folderName)"
        >
          进入
        </button>
      </div>
    </div>

    <!-- 子文件夹列表 (递归支持理论上无限层级嵌套与悬停预览) -->
    <div v-if="getDirectSubfolders(folderName).length > 0" class="cascade-subfolders-section">
      <div class="cascade-subfolders-label">
        <div style="display: inline-flex; align-items: center; gap: 0.3rem;">
          <SvgIcon name="folder" size="11" />
          <span>下级分类 ({{ getDirectSubfolders(folderName).length }})</span>
        </div>
        <span class="cascade-subfolder-tip">悬停展开 / 可拖入</span>
      </div>

      <div class="cascade-subfolder-pills">
        <div
          v-for="subf in getDirectSubfolders(folderName)"
          :key="subf.name"
          class="cascade-subfolder-pill-wrapper"
          @mouseenter="onSubfolderMouseEnter(subf.name)"
        >
          <div
            class="cascade-subfolder-pill"
            :class="{
              'is-active-cascade': activeCascadePath[depth + 1] === subf.name,
              'is-drop-target': dragOverTarget === subf.name
            }"
            draggable="true"
            :title="`[${subf.name}]：鼠标点击打开/悬停预览；触屏单击预览/双击打开`"
            @pointerdown="onSubfolderPointerDown($event, subf.name)"
            @pointerup="onSubfolderPointerUp($event, subf.name)"
            @click.stop="onSubfolderClick($event, subf.name)"
            @dragstart="$emit('drag-start-folder', $event, subf.name)"
            @dragend="$emit('drag-end-folder')"
            @dragover.prevent="$emit('drag-over-folder', $event, subf.name); $emit('open-cascade', depth + 1, subf.name)"
            @dragleave="$emit('drag-leave-folder', $event, subf.name)"
            @drop="$emit('drop-target', $event, subf.name)"
          >
            <SvgIcon name="folder" size="12" />
            <span class="pill-name">{{ getFolderBaseName(subf.name) }}</span>
            <span class="pill-count">({{ getFolderBookmarks(subf.name, true).length }})</span>
            <span class="pill-arrow">›</span>
          </div>

          <!-- 递归渲染下一级子文件夹级联弹窗 (无限层级) -->
          <div
            v-if="activeCascadePath[depth + 1] === subf.name"
            class="recursive-cascade-flyout"
            @mouseenter="$emit('cancel-close')"
            @mouseleave="$emit('schedule-close')"
          >
            <FolderCascadeMenu
              :folder-name="subf.name"
              :depth="depth + 1"
              :active-cascade-path="activeCascadePath"
              :drag-over-target="dragOverTarget"
              :drag-over-position="dragOverPosition"
              :dragged-folder-name="draggedFolderName"
              :dragged-bookmark-id="draggedBookmarkId"
              @select-folder="$emit('select-folder', $event)"
              @open-cascade="(d, f) => $emit('open-cascade', d, f)"
              @cancel-close="$emit('cancel-close')"
              @schedule-close="$emit('schedule-close')"
              @move-out="$emit('move-out', $event)"
              @remove-bm="(bId, fName) => $emit('remove-bm', bId, fName)"
              @drag-start-bm="(e, bId) => $emit('drag-start-bm', e, bId)"
              @drag-end-bm="(e) => $emit('drag-end-bm', e)"
              @drag-start-folder="(e, f) => $emit('drag-start-folder', e, f)"
              @drag-end-folder="$emit('drag-end-folder')"
              @drag-over-folder="(e, f) => $emit('drag-over-folder', e, f)"
              @drag-leave-folder="(e, f) => $emit('drag-leave-folder', e, f)"
              @drop-target="(e, f) => $emit('drop-target', e, f)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 直属书签列表与放置区 -->
    <div
      class="cascade-bookmarks-section"
      :class="{ 'is-drop-target': dragOverTarget === folderName && (draggedBookmarkId || draggedFolderName) }"
      @dragover.prevent="$emit('drag-over-folder', $event, folderName)"
      @dragleave="$emit('drag-leave-folder', $event, folderName)"
      @drop.stop.prevent="$emit('drop-target', $event, folderName)"
    >
      <div class="cascade-bookmarks-header">
        <div style="display: inline-flex; align-items: center; gap: 0.3rem;">
          <SvgIcon name="file-text" size="11" />
          <span>直属书签 ({{ getFolderBookmarks(folderName, false).length }})</span>
        </div>
        <span v-if="draggedBookmarkId" class="drop-hint-inline">松开放入此分类</span>
      </div>

      <div class="cascade-bookmarks-list">
        <div v-if="getFolderBookmarks(folderName, false).length === 0" class="cascade-empty-hint">
          暂无直属书签，拖拽书签至此即可归类
        </div>

        <div
          v-for="bm in getFolderBookmarks(folderName, false)"
          :key="bm.id"
          class="cascade-bm-row"
          :class="{ 'is-dragging': draggedBookmarkId === bm.id }"
          draggable="true"
          :title="`[${bm.title}]：可拖拽移动至其他文件夹或子分类`"
          @dragstart.stop="handleBmDragStart($event, bm.id)"
          @dragend.stop="handleBmDragEnd"
        >
          <div class="cascade-bm-drag-handle" title="按住拖拽移动此书签">
            <span class="cascade-bm-bullet">•</span>
          </div>
          <a :href="bm.url" target="_blank" rel="noopener noreferrer" class="cascade-bm-link" :title="`访问：${bm.title}`">
            <span class="cascade-bm-title">{{ bm.title }}</span>
          </a>

          <button
            class="btn-remove-bm"
            title="从该文件夹移出"
            @click.stop.prevent="$emit('remove-bm', bm.id, folderName)"
          >
            <SvgIcon name="close" size="11" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import SvgIcon from './SvgIcon.vue'
import { ICONS, useBookmarks } from '../pages/state'

const props = defineProps<{
  folderName: string
  depth: number
  activeCascadePath: string[]
  dragOverTarget: string | null
  dragOverPosition: 'before' | 'after' | 'inside' | null
  draggedFolderName: string | null
  draggedBookmarkId: string | null
}>()

const emit = defineEmits<{
  (e: 'select-folder', folderName: string): void
  (e: 'open-cascade', depth: number, folderName: string): void
  (e: 'cancel-close'): void
  (e: 'schedule-close'): void
  (e: 'move-out', folderName: string): void
  (e: 'remove-bm', bookmarkId: string, folderName: string): void
  (e: 'drag-start-bm', event: DragEvent, bookmarkId: string): void
  (e: 'drag-end-bm', event: DragEvent): void
  (e: 'drag-start-folder', event: DragEvent, folderName: string): void
  (e: 'drag-end-folder'): void
  (e: 'drag-over-folder', event: DragEvent, folderName: string): void
  (e: 'drag-leave-folder', event: DragEvent, folderName: string): void
  (e: 'drop-target', event: DragEvent, folderName: string): void
}>()

const { getDirectSubfolders, getFolderBookmarks } = useBookmarks()

const getFolderBaseName = (name: string) => {
  if (!name) return ''
  const parts = name.split('/')
  return parts[parts.length - 1]
}

const handleBmDragStart = (e: DragEvent, bookmarkId: string) => {
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/inkgist-type', 'bookmark')
    e.dataTransfer.setData('text/plain', bookmarkId)
  }
  emit('drag-start-bm', e, bookmarkId)
}

const handleBmDragEnd = (e: DragEvent) => {
  emit('drag-end-bm', e)
}

// 子文件夹指针与手势处理 (严格区分鼠标与触屏)
let lastPointerType = 'mouse'
let touchStartX = 0
let touchStartY = 0
let lastTouchTapTime = 0
let lastTappedSubfolder = ''
let touchTapTimer: any = null

const onSubfolderPointerDown = (e: PointerEvent, subfName: string) => {
  lastPointerType = e.pointerType || 'mouse'
  if (e.pointerType === 'mouse' || !e.pointerType) {
    lastPointerType = 'mouse'
  } else {
    touchStartX = e.clientX
    touchStartY = e.clientY
  }
}

const onSubfolderPointerUp = (e: PointerEvent, subfName: string) => {
  if (e.pointerType !== 'mouse' && e.pointerType) {
    const dist = Math.hypot(e.clientX - touchStartX, e.clientY - touchStartY)
    if (dist < 12) {
      const now = Date.now()
      if (lastTappedSubfolder === subfName && now - lastTouchTapTime < 340) {
        // 非鼠标/触屏双击：直接进入该子文件夹
        if (touchTapTimer) clearTimeout(touchTapTimer)
        lastTouchTapTime = 0
        lastTappedSubfolder = ''
        emit('select-folder', subfName)
      } else {
        // 非鼠标/触屏单击：展开下一层预览浮窗 (不自动关闭)
        lastTouchTapTime = now
        lastTappedSubfolder = subfName
        if (touchTapTimer) clearTimeout(touchTapTimer)
        touchTapTimer = setTimeout(() => {
          lastTouchTapTime = 0
          lastTappedSubfolder = ''
        }, 360)
        emit('open-cascade', props.depth + 1, subfName)
      }
    }
  }
}

const onSubfolderClick = (e: MouseEvent, subfName: string) => {
  if (lastPointerType === 'mouse') {
    // 鼠标点击：直接进入该文件夹
    emit('select-folder', subfName)
  }
}

const onSubfolderMouseEnter = (subfName: string) => {
  if (lastPointerType === 'touch' || lastPointerType === 'pen') return
  // 鼠标悬停：展开级联预览
  emit('open-cascade', props.depth + 1, subfName)
}
</script>

<style scoped>
.folder-cascade-card {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl, 0 12px 36px rgba(0, 0, 0, 0.28));
  padding: 0.75rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.cascade-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.45rem;
  border-bottom: 1px solid var(--border-subtle);
  gap: 0.5rem;
}

.cascade-title-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
  flex: 1;
}

.cascade-title {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.cascade-count-tag {
  font-size: 0.6875rem;
  color: var(--text-muted);
  background-color: var(--bg-surface-subtle);
  padding: 0.1rem 0.35rem;
  border-radius: var(--radius-full);
  white-space: nowrap;
  flex-shrink: 0;
}

.cascade-actions {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex-shrink: 0;
}

.btn-cascade-act {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-xs);
  border: none;
  background-color: var(--bg-surface-subtle);
  color: var(--text-muted);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}
.btn-cascade-act:hover {
  color: var(--text-main);
  background-color: var(--bg-surface-hover);
}
.btn-cascade-act.btn-cascade-enter {
  background-color: var(--primary);
  color: var(--primary-contrast);
  border-color: var(--primary);
  font-weight: 600;
}

/* 下级子分类 */
.cascade-subfolders-section {
  padding-bottom: 0.45rem;
  border-bottom: 1px dashed var(--border-subtle);
}

.cascade-subfolders-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--text-muted);
  margin-bottom: 0.35rem;
}

.cascade-subfolder-tip {
  font-size: 0.625rem;
  color: var(--text-subtle);
  font-weight: normal;
}

.cascade-subfolder-pills {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.cascade-subfolder-pill-wrapper {
  position: relative;
}

.cascade-subfolder-pill {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.38rem 0.6rem;
  border-radius: var(--radius-sm);
  background-color: var(--bg-surface-subtle);
  border: none;
  font-size: 0.75rem;
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.15s ease;
}
.cascade-subfolder-pill:hover,
.cascade-subfolder-pill.is-active-cascade {
  background-color: var(--bg-surface-hover);
  color: var(--primary);
}
.cascade-subfolder-pill.is-drop-target {
  background-color: var(--bg-surface-hover) !important;
  color: var(--primary) !important;
}

.pill-name {
  font-weight: 600;
  margin-right: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pill-count {
  font-size: 0.6875rem;
  color: var(--text-muted);
  margin-right: auto;
  padding-left: 0.2rem;
}
.pill-arrow {
  font-size: 0.8125rem;
  color: var(--text-subtle);
}

/* 递归多级弹窗容器 - 添加透明 Hitbox 桥接层，杜绝鼠标横向移动时由于微小间隙触发 mouseleave 闪退 */
.recursive-cascade-flyout {
  position: absolute;
  left: 100%;
  top: -6px;
  padding-left: 0.4rem;
  z-index: 150;
}
.recursive-cascade-flyout::before {
  content: '';
  position: absolute;
  top: -10px;
  bottom: -10px;
  left: -12px;
  width: 20px;
  background: transparent;
  pointer-events: auto;
}

/* 直属书签展示与拖放区 */
.cascade-bookmarks-section {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  border-radius: var(--radius-sm);
  transition: all 0.15s ease;
  padding: 0.3rem;
}
.cascade-bookmarks-section.is-drop-target {
  background-color: var(--primary-light, rgba(79, 70, 229, 0.12)) !important;
  box-shadow: inset 0 0 0 1.5px var(--primary);
  border-radius: var(--radius-sm);
}

.cascade-bookmarks-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--text-muted);
}

.drop-hint-inline {
  font-size: 0.625rem;
  color: var(--primary);
  font-weight: 600;
  animation: pulseHint 1s infinite alternate;
}

.cascade-bookmarks-list {
  max-height: 190px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.cascade-empty-hint {
  font-size: 0.6875rem;
  color: var(--text-subtle);
  text-align: center;
  padding: 0.6rem 0.25rem;
  background-color: var(--bg-surface-subtle);
  border-radius: var(--radius-xs);
  border: none;
}

.cascade-bm-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.3rem 0.4rem;
  border-radius: var(--radius-xs);
  background-color: var(--bg-surface-subtle);
  cursor: grab;
  cursor: -webkit-grab;
  transition: all 0.15s ease;
  user-select: none;
}
.cascade-bm-row:hover {
  background-color: var(--bg-surface-hover);
  color: var(--primary);
}
.cascade-bm-row:active {
  cursor: grabbing;
  cursor: -webkit-grabbing;
}
.cascade-bm-row.is-dragging {
  opacity: 0.4;
  transform: scale(0.97);
}

.cascade-bm-drag-handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding-right: 0.25rem;
  color: var(--text-subtle);
}

.cascade-bm-link {
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
.cascade-bm-link:hover {
  color: var(--link-blue);
  text-decoration: underline;
}

.cascade-bm-bullet {
  color: var(--text-subtle);
}

.cascade-bm-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-remove-bm {
  border: none;
  background: transparent;
  padding: 0.15rem;
  color: var(--text-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-xs);
  transition: all 0.15s;
}
.btn-remove-bm:hover {
  color: var(--danger);
  background-color: var(--danger-50);
}

@media (max-width: 640px) {
  .cascade-subfolder-pill-wrapper {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .recursive-cascade-flyout {
    position: static !important;
    left: auto !important;
    top: auto !important;
    padding-left: 0 !important;
    padding-top: 0.35rem !important;
    width: 100% !important;
    box-sizing: border-box !important;
  }
}
</style>
