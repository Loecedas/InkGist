<template>
  <div v-if="isOpen" class="mobile-folder-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-folder-title" @click.self="$emit('close')">
    <div class="mobile-folder-sheet">
      <div class="sheet-drag-handle"></div>
      
      <div class="sheet-header">
        <div class="sheet-title-group">
          <SvgIcon name="folder" size="16" />
          <span id="modal-folder-title" class="sheet-title">移动书签至文件夹</span>
        </div>
        <button class="sheet-close-btn" aria-label="关闭文件夹选择弹窗" @click="$emit('close')">
          <SvgIcon name="close" size="14" />
        </button>
      </div>

      <p class="sheet-bookmark-name" :title="bookmarkTitle">
        当前书签：<strong>{{ bookmarkTitle }}</strong>
      </p>

      <!-- 文件夹列表 -->
      <div class="folder-selection-list">
        <!-- 未分类 / 全部 -->
        <button
          class="folder-select-item"
          :class="{ active: currentFolder === undefined || currentFolder === 'all' }"
          @click="selectFolder('all')"
        >
          <div class="item-left">
            <SvgIcon name="folder" size="14" />
            <span>未分类 (移出所有分类)</span>
          </div>
          <span v-if="currentFolder === undefined || currentFolder === 'all'" class="check-mark">✓</span>
        </button>

        <!-- 各自定义分类 (层级分明展示，子文件夹独立展示名称并缩进显示父级归属) -->
        <button
          v-for="item in formattedFolderOptions"
          :key="item.fullName"
          class="folder-select-item"
          :class="{
            active: currentFolder === item.fullName,
            'is-subfolder-row': item.depth > 0
          }"
          :style="{ paddingLeft: item.depth > 0 ? `calc(0.75rem + ${item.depth * 1.1}rem)` : undefined }"
          :title="item.parentPath ? `[${item.baseName}] (属于上级分类: ${item.parentPath})` : item.baseName"
          @click="selectFolder(item.fullName)"
        >
          <div class="item-left">
            <span v-if="item.depth > 0" class="subfolder-indent-symbol">└─</span>
            <SvgIcon name="folder" size="14" />
            <span class="folder-text">{{ item.baseName }}</span>
            <span v-if="item.parentPath" class="folder-parent-badge">{{ item.parentPath }}</span>
          </div>
          <span v-if="currentFolder === item.fullName" class="check-mark">✓</span>
        </button>
      </div>

      <!-- 新建文件夹快捷入口 -->
      <div class="sheet-footer-new-folder">
        <div v-if="!isCreating" class="new-folder-trigger" @click="isCreating = true">
          <SvgIcon name="plus" size="14" />
          <span>新建分类文件夹</span>
        </div>
        <div v-else class="new-folder-form">
          <input
            v-model="newFolderName"
            type="text"
            placeholder="输入新文件夹名称(支持 父/子)..."
            class="folder-input-field"
            aria-label="新分类文件夹名称"
            autoFocus
            @keydown.enter="handleCreateAndAssign"
            @keydown.esc="isCreating = false"
          />
          <button class="btn-action btn-confirm" aria-label="确认创建" @click="handleCreateAndAssign">
            <SvgIcon name="check" size="14" />
          </button>
          <button class="btn-action btn-cancel" aria-label="取消创建" @click="isCreating = false">
            <SvgIcon name="close" size="14" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import SvgIcon from './SvgIcon.vue'
import { ICONS, type BookmarkFolder } from '../pages/state'

const props = defineProps<{
  isOpen: boolean
  bookmarkId: string
  bookmarkTitle: string
  currentFolder?: string
  folders: BookmarkFolder[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'assign', payload: { bookmarkId: string; folderName: string }): void
  (e: 'create-and-assign', payload: { bookmarkId: string; newFolderName: string }): void
}>()

const isCreating = ref(false)
const newFolderName = ref('')

interface FormattedFolderOption {
  id: string
  fullName: string
  baseName: string
  parentPath: string | null
  depth: number
}

// 格式化为树形层级排序，让每个文件夹独立展示名称并缩进
const formattedFolderOptions = computed<FormattedFolderOption[]>(() => {
  if (!props.folders || props.folders.length === 0) return []
  
  const all = props.folders.map(f => {
    const parts = f.name.split('/')
    return {
      id: f.id,
      fullName: f.name,
      baseName: parts[parts.length - 1],
      parentPath: parts.length > 1 ? parts.slice(0, -1).join('/') : null,
      depth: parts.length - 1
    }
  })

  // 按自然树状层级顺序排序
  all.sort((a, b) => a.fullName.localeCompare(b.fullName, 'zh-CN'))
  return all
})

watch(
  () => props.isOpen,
  (open) => {
    if (typeof document !== 'undefined') {
      if (open) {
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = ''
      }
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
})

const selectFolder = (folderName: string) => {
  emit('assign', { bookmarkId: props.bookmarkId, folderName })
  emit('close')
}

const handleCreateAndAssign = () => {
  const trimmed = newFolderName.value.trim()
  if (!trimmed) return
  const lower = trimmed.toLowerCase()
  if (lower === 'all' || lower === 'uncategorized' || trimmed === '全部' || trimmed === '未分类') {
    selectFolder('all')
    isCreating.value = false
    newFolderName.value = ''
    return
  }
  const existing = props.folders.find(f => f.name.toLowerCase() === lower)
  if (existing) {
    selectFolder(existing.name)
    isCreating.value = false
    newFolderName.value = ''
    return
  }
  emit('create-and-assign', { bookmarkId: props.bookmarkId, newFolderName: trimmed })
  newFolderName.value = ''
  isCreating.value = false
  emit('close')
}
</script>

<style scoped>
.mobile-folder-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 150;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overscroll-behavior: contain;
}

.mobile-folder-sheet {
  width: 100%;
  max-width: 480px;
  background-color: var(--bg-surface);
  border-top: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  box-shadow: var(--shadow-2xl);
  padding: 0.75rem 1.25rem max(2rem, calc(env(safe-area-inset-bottom, 0px) + 1.5rem));
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  animation: slideUpSheet 0.25s ease-out;
}

@keyframes slideUpSheet {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.sheet-drag-handle {
  width: 36px;
  height: 4px;
  background-color: var(--border-strong);
  border-radius: 2px;
  align-self: center;
  margin-bottom: 0.25rem;
}

.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sheet-title-group {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--text-main);
}

.sheet-close-btn {
  background: transparent;
  border: none;
  color: var(--text-subtle);
  padding: 0.25rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sheet-close-btn:hover { color: var(--text-main); }

.sheet-bookmark-name {
  font-size: 0.8125rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
}

.folder-selection-list {
  max-height: 220px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.25rem 0;
}

.folder-select-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 0.85rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  background-color: var(--bg-surface-subtle);
  color: var(--text-main);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.15s ease;
}
.folder-select-item:active, .folder-select-item:hover {
  background-color: var(--bg-surface-hover);
  border-color: var(--border-strong);
}
.folder-select-item.active {
  background-color: var(--primary);
  color: var(--primary-contrast) !important;
  border-color: var(--primary);
  font-weight: 600;
}

.item-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  flex: 1;
}

.subfolder-indent-symbol {
  color: var(--text-muted);
  font-family: monospace;
  font-size: 0.8125rem;
  opacity: 0.7;
}

.folder-parent-badge {
  font-size: 0.6875rem;
  color: var(--text-muted);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  padding: 0.05rem 0.35rem;
  border-radius: var(--radius-xs);
  margin-left: 0.35rem;
  white-space: nowrap;
}

.folder-select-item.active .folder-parent-badge {
  background: rgba(255, 255, 255, 0.2);
  color: var(--primary-contrast);
  border-color: rgba(255, 255, 255, 0.3);
}

.folder-select-item.active .subfolder-indent-symbol {
  color: var(--primary-contrast);
}

.folder-text {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.check-mark {
  font-weight: 700;
  font-size: 0.9375rem;
}

.sheet-footer-new-folder {
  padding-top: 0.5rem;
  border-top: 1px solid var(--border-subtle);
}

.new-folder-trigger {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8125rem;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.35rem 0;
}
.new-folder-trigger:hover { color: var(--primary); }

.new-folder-form {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.folder-input-field {
  flex: 1;
  height: 36px;
  padding: 0 0.65rem;
  font-size: 0.8125rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background-color: var(--bg-surface-subtle);
  color: var(--text-main);
  outline: none;
}

.btn-action {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  background-color: var(--bg-surface-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-main);
}
.btn-action.btn-confirm:hover {
  background-color: var(--primary);
  color: var(--primary-contrast);
  border-color: var(--primary);
}
.btn-action.btn-cancel:hover {
  color: var(--danger);
  border-color: var(--danger);
}
</style>
