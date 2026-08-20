<template>
  <div v-if="isOpen" class="rename-folder-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="rename-dialog-title" @click.self="$emit('close')">
    <div class="rename-folder-dialog">
      <div class="dialog-title">
        <svg class="svg-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.edit"></svg>
        <span id="rename-dialog-title">重命名文件夹</span>
      </div>
      <p class="dialog-sub">原名称：<strong>{{ folderName }}</strong></p>
      
      <input
        ref="inputRef"
        v-model="newName"
        type="text"
        class="rename-input"
        placeholder="请输入新的文件夹名称..."
        aria-label="新的文件夹名称"
        @keydown.enter="handleConfirm"
        @keydown.esc="$emit('close')"
      />

      <div class="dialog-actions">
        <button type="button" class="btn-secondary btn-sm" aria-label="取消重命名" @click="$emit('close')">取消</button>
        <button
          type="button"
          class="btn-primary btn-sm"
          aria-label="确认重命名"
          :disabled="!newName.trim() || newName.trim() === folderName"
          @click="handleConfirm"
        >
          <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.check"></svg>
          <span>确认重命名</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { ICONS } from '../pages/state'

const props = defineProps<{
  isOpen: boolean
  folderName: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', newName: string): void
}>()

const newName = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      newName.value = props.folderName
      nextTick(() => {
        inputRef.value?.focus()
        inputRef.value?.select()
      })
    }
  }
)

const handleConfirm = () => {
  if (!newName.value.trim() || newName.value.trim() === props.folderName) return
  emit('submit', newName.value.trim())
}
</script>

<style scoped>
.rename-folder-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 150;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
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
  animation: popScale 0.2s ease-out;
}

@keyframes popScale {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
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
  height: 38px;
  padding: 0 0.75rem;
  font-size: 0.875rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  background-color: var(--bg-surface-subtle);
  color: var(--text-main);
  outline: none;
}
.rename-input:focus {
  border-color: var(--primary);
  background-color: var(--bg-surface);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.25rem;
}
</style>
