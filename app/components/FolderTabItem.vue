<template>
  <div
    ref="wrapperRef"
    class="folder-tab-wrapper"
    :class="{
      'is-dragging-self': draggedFolderName === folder.name,
      'is-drag-over-before': dragOverTarget === folder.name && dragOverPosition === 'before',
      'is-drag-over-after': dragOverTarget === folder.name && dragOverPosition === 'after',
      'is-drag-over-inside': dragOverTarget === folder.name && dragOverPosition === 'inside'
    }"
    @mouseenter="$emit('open-cascade', 0, folder.name)"
    @mouseleave="$emit('schedule-close')"
  >
    <button
      class="folder-tab-btn"
      :class="{
        active: isActive,
        'is-drag-target': dragOverTarget === folder.name && dragOverPosition === 'inside'
      }"
      :draggable="!isSelectMode"
      :title="`[${folder.name}]：鼠标点击打开/悬停预览/长按拖拽；触屏单击预览/双击打开`"
      @click="onButtonClick"
      @pointerdown="onPointerDown"
      @pointerup="onPointerUp"
      @dragstart="onDragStart"
      @dragend="$emit('drag-end', $event)"
      @dragenter.prevent="$emit('open-cascade', 0, folder.name)"
      @dragover.prevent="$emit('drag-over', $event, folder.name); $emit('open-cascade', 0, folder.name)"
      @dragleave="$emit('drag-leave', $event, folder.name)"
      @drop="$emit('drop', $event, folder.name)"
    >
      <SvgIcon name="folder" size="13" />
      <span class="folder-name">{{ baseName }}</span>
      <span class="folder-count">({{ bookmarkCount }})</span>
      <span v-if="subfolderCount > 0" class="subfolder-indicator" :title="`包含 ${subfolderCount} 个子文件夹`">
        ▾{{ subfolderCount }}
      </span>
      <span v-if="dragOverTarget === folder.name && dragOverPosition === 'inside' && draggedFolderName" class="drag-hint-badge">放入子级</span>
    </button>

    <!-- 鼠标悬停 / 触屏单击展开多级递归级联预览浮窗 (支持智能视口边界对齐与自适应) -->
    <div
      v-if="cascadePath[0] === folder.name"
      class="folder-hover-dropdown-bridge"
      :style="bridgeAlignStyle"
      @mouseenter="$emit('cancel-close')"
      @mouseleave="onMouseLeave"
    >
      <FolderCascadeMenu
        :folder-name="folder.name"
        :depth="0"
        :active-cascade-path="cascadePath"
        :drag-over-target="dragOverTarget"
        :drag-over-position="dragOverPosition"
        :dragged-folder-name="draggedFolderName"
        :dragged-bookmark-id="draggedBookmarkId"
        @select-folder="$emit('select-folder', $event)"
        @open-cascade="(d, f) => $emit('open-cascade', d, f)"
        @cancel-close="$emit('cancel-close')"
        @schedule-close="onMouseLeave"
        @move-out="$emit('move-out', $event)"
        @remove-bm="$emit('remove-bm', $event)"
        @drag-start-bm="(e, id) => $emit('drag-start-bm', e, id)"
        @drag-end-bm="(e) => $emit('drag-end-bm', e)"
        @drag-start-folder="(e, f) => $emit('drag-start', e, f)"
        @drag-end-folder="(e) => $emit('drag-end', e)"
        @drag-over-folder="(e, f) => $emit('drag-over', e, f)"
        @drag-leave-folder="(e, f) => $emit('drag-leave', e, f)"
        @drop-target="(e, f) => $emit('drop', e, f)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import SvgIcon from './SvgIcon.vue'
import FolderCascadeMenu from './FolderCascadeMenu.vue'
import { useBookmarks, type BookmarkFolder } from '../pages/state'

const props = defineProps<{
  folder: BookmarkFolder
  isActive: boolean
  isSelectMode: boolean
  dragOverTarget: string | null
  dragOverPosition: 'before' | 'after' | 'inside' | null
  draggedFolderName: string | null
  draggedBookmarkId: string | null
  cascadePath: string[]
}>()

const emit = defineEmits<{
  (e: 'select-folder', name: string): void
  (e: 'open-cascade', depth: number, name: string): void
  (e: 'cancel-close'): void
  (e: 'schedule-close'): void
  (e: 'move-out', name: string): void
  (e: 'remove-bm', id: string): void
  (e: 'drag-start-bm', ev: DragEvent, id: string): void
  (e: 'drag-end-bm', ev: DragEvent): void
  (e: 'drag-start', ev: DragEvent, name: string): void
  (e: 'drag-end', ev: DragEvent): void
  (e: 'drag-over', ev: DragEvent, name: string): void
  (e: 'drag-leave', ev: DragEvent, name: string): void
  (e: 'drop', ev: DragEvent, name: string): void
}>()

const { getDirectSubfolders, getFolderBookmarks } = useBookmarks()

const wrapperRef = ref<HTMLElement | null>(null)

const baseName = computed(() => {
  const parts = props.folder.name.split('/')
  return parts[parts.length - 1]
})

const bookmarkCount = computed(() => {
  return getFolderBookmarks(props.folder.name, false).length
})

const subfolderCount = computed(() => {
  return getDirectSubfolders(props.folder.name).length
})

const bridgeAlignStyle = computed(() => {
  if (typeof window === 'undefined' || !wrapperRef.value) return {}
  const rect = wrapperRef.value.getBoundingClientRect()
  const screenWidth = window.innerWidth
  // 浮窗宽度：在桌面端最大 310px，小屏幕上自适应视口宽度 (左右各预留 14px 安全留白)
  const targetWidth = Math.min(310, screenWidth - 28)

  // 1. 默认与当前按钮左对齐
  let offsetLeft = 0

  // 2. 右侧溢出检测与回退：若浮窗右边缘超出屏幕右边界，向左平移
  if (rect.left + targetWidth > screenWidth - 14) {
    offsetLeft = (screenWidth - 14) - (rect.left + targetWidth)
  }

  // 3. 左侧溢出检测与回退：若平移后左边缘超出屏幕左边界，向右平移，严格锁定左边界 >= 14px
  if (rect.left + offsetLeft < 14) {
    offsetLeft = 14 - rect.left
  }

  return {
    left: `${offsetLeft}px`,
    right: 'auto',
    width: `${targetWidth}px`,
    maxWidth: `calc(100vw - 28px)`
  }
})

// 鼠标悬停 (原生 mouseenter / mouseleave)
const onMouseEnter = () => {
  if (lastPointerType === 'touch' || lastPointerType === 'pen') return
  emit('open-cascade', 0, props.folder.name)
}

const onMouseLeave = () => {
  if (lastPointerType === 'touch' || lastPointerType === 'pen') return
  emit('schedule-close')
}

// 指针与手势处理 (严格区分鼠标与触屏)
let lastPointerType = 'mouse'
let touchStartX = 0
let touchStartY = 0
let lastTouchTapTime = 0
let touchTapTimer: any = null

const onPointerDown = (e: PointerEvent) => {
  lastPointerType = e.pointerType || 'mouse'
  if (e.pointerType === 'mouse' || !e.pointerType) {
    lastPointerType = 'mouse'
  } else {
    touchStartX = e.clientX
    touchStartY = e.clientY
  }
}

const onPointerUp = (e: PointerEvent) => {
  if (e.pointerType === 'touch' || e.pointerType === 'pen') {
    const moveDist = Math.hypot(e.clientX - touchStartX, e.clientY - touchStartY)
    if (moveDist > 10) {
      return
    }

    const now = Date.now()
    if (now - lastTouchTapTime < 350) {
      // 触屏双击：打开并进入文件夹
      if (touchTapTimer) clearTimeout(touchTapTimer)
      lastTouchTapTime = 0
      emit('select-folder', props.folder.name)
    } else {
      // 触屏单击：展开预览框，且不要自动关闭
      lastTouchTapTime = now
      if (touchTapTimer) clearTimeout(touchTapTimer)
      touchTapTimer = setTimeout(() => {
        emit('cancel-close')
        emit('open-cascade', 0, props.folder.name)
        emit('cancel-close')
      }, 200)
    }
  }
}

const onButtonClick = (e: MouseEvent) => {
  // 鼠标单击直接打开并进入文件夹 (如果是拖拽释放则不触发点击导航)
  if (lastPointerType === 'mouse' && !props.draggedFolderName) {
    emit('select-folder', props.folder.name)
  }
}

const onDragStart = (e: DragEvent) => {
  // 只有在鼠标操作时允许长按拖动文件夹，触屏等其他方式一律禁止
  if (lastPointerType === 'touch' || lastPointerType === 'pen') {
    e.preventDefault()
    return
  }
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/inkgist-type', 'folder')
    e.dataTransfer.setData('text/plain', props.folder.name)
  }
  emit('drag-start', e, props.folder.name)
}
</script>

<style scoped>
.folder-tab-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}

.folder-tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-full);
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-muted);
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
  user-select: none;
  -webkit-user-select: none;
  -webkit-user-drag: element;
}

.folder-tab-btn:hover {
  color: var(--text-main);
  border-color: var(--border-focus);
  background-color: var(--bg-surface-hover, var(--bg-surface));
}

.folder-tab-btn.active {
  color: var(--primary);
  background-color: var(--primary-light, rgba(79, 70, 229, 0.08));
  border-color: var(--primary);
  font-weight: 600;
}

.folder-count {
  font-size: 0.75rem;
  opacity: 0.8;
}

.subfolder-indicator {
  font-size: 0.7rem;
  padding: 0.05rem 0.25rem;
  border-radius: var(--radius-sm);
  background: var(--bg-surface-subtle);
  color: var(--text-muted);
  margin-left: -0.1rem;
}

.drag-hint-badge {
  font-size: 0.6875rem;
  background-color: var(--primary);
  color: var(--primary-contrast) !important;
  font-weight: 600;
  padding: 0.1rem 0.4rem;
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-sm);
  animation: pulseHint 1s infinite alternate;
}

/* 浮层桥接容器与透明无缝 Hitbox */
.folder-hover-dropdown-bridge {
  position: absolute;
  top: 100%;
  padding-top: 0.4rem;
  z-index: 100;
  max-width: calc(100vw - 1.5rem);
  animation: fadeInDropdown 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}
.folder-hover-dropdown-bridge::before {
  content: '';
  position: absolute;
  top: -12px;
  left: 0;
  right: 0;
  height: 16px;
  background: transparent;
  pointer-events: auto;
}

@keyframes fadeInDropdown {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulseHint {
  from { transform: scale(0.95); opacity: 0.85; }
  to { transform: scale(1.05); opacity: 1; }
}

.folder-tab-wrapper.is-drag-over-before .folder-tab-btn {
  box-shadow: -3px 0 0 0 var(--primary);
}
.folder-tab-wrapper.is-drag-over-after .folder-tab-btn {
  box-shadow: 3px 0 0 0 var(--primary);
}
.folder-tab-wrapper.is-drag-over-inside .folder-tab-btn {
  border-color: var(--primary) !important;
  background-color: var(--bg-surface-hover) !important;
  color: var(--primary) !important;
}
.folder-tab-wrapper.is-dragging-self {
  opacity: 0.35;
}
</style>
