<template>
  <div v-if="isOpen" class="mobile-folder-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-folder-title" @click.self="$emit('close')">
    <div class="mobile-folder-sheet">
      <div class="sheet-drag-handle"></div>
      
      <div class="sheet-header">
        <div class="sheet-title-group">
          <svg class="svg-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.folder"></svg>
          <span id="modal-folder-title" class="sheet-title">移动书签至文件夹</span>
        </div>
        <button class="sheet-close-btn" aria-label="关闭文件夹选择弹窗" @click="$emit('close')">
          <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.close"></svg>
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
            <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.folder"></svg>
            <span>未分类 (移出所有分类)</span>
          </div>
          <span v-if="currentFolder === undefined || currentFolder === 'all'" class="check-mark">✓</span>
        </button>

        <!-- 各自定义分类 -->
        <button
          v-for="folder in folders"
          :key="folder.id"
          class="folder-select-item"
          :class="{ active: currentFolder === folder.name }"
          @click="selectFolder(folder.name)"
        >
          <div class="item-left">
            <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.folder"></svg>
            <span class="folder-text">{{ folder.name }}</span>
          </div>
          <span v-if="currentFolder === folder.name" class="check-mark">✓</span>
        </button>
      </div>

      <!-- 新建文件夹快捷入口 -->
      <div class="sheet-footer-new-folder">
        <div v-if="!isCreating" class="new-folder-trigger" @click="isCreating = true">
          <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.plus"></svg>
          <span>新建分类文件夹</span>
        </div>
        <div v-else class="new-folder-form">
          <input
            v-model="newFolderName"
            type="text"
            placeholder="输入新文件夹名称..."
            class="folder-input-field"
            aria-label="新分类文件夹名称"
            autoFocus
            @keydown.enter="handleCreateAndAssign"
            @keydown.esc="isCreating = false"
          />
          <button class="btn-action btn-confirm" aria-label="确认创建" @click="handleCreateAndAssign">
            <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.check"></svg>
          </button>
          <button class="btn-action btn-cancel" aria-label="取消创建" @click="isCreating = false">
            <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.close"></svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
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

const selectFolder = (folderName: string) => {
  emit('assign', { bookmarkId: props.bookmarkId, folderName })
  emit('close')
}

const handleCreateAndAssign = () => {
  if (!newFolderName.value.trim()) return
  emit('create-and-assign', { bookmarkId: props.bookmarkId, newFolderName: newFolderName.value.trim() })
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
}

.folder-text {
  max-width: 260px;
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
