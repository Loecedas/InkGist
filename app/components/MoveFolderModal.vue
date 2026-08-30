<template>
  <div v-if="isOpen" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="move-folder-title" @click.self="$emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <div class="header-title-group">
          <SvgIcon name="folder" size="18" />
          <h3 id="move-folder-title" class="modal-title">移动文件夹分类</h3>
        </div>
        <button class="btn-close" aria-label="关闭弹窗" @click="$emit('close')">
          <SvgIcon name="close" size="14" />
        </button>
      </div>

      <div class="modal-body">
        <p class="move-hint">
          将文件夹 <strong>「{{ baseName }}」</strong> 归入到另一个文件夹成为其子文件夹，或移至根目录：
        </p>

        <div class="folder-tree-options">
          <!-- 选项 1：移至顶级根目录 -->
          <button
            type="button"
            class="folder-option-item"
            :class="{ active: currentParent === null }"
            @click="handleSelect(null)"
          >
            <div class="option-left">
              <SvgIcon name="cornerUpLeft" size="14" />
              <span class="option-name">顶级根目录 (不属于任何文件夹)</span>
            </div>
            <span v-if="currentParent === null" class="check-badge">✓ 当前位置</span>
          </button>

          <!-- 选项 2：可选的目标父文件夹列表 (已排除自身与自身子文件夹) -->
          <button
            v-for="target in eligibleTargets"
            :key="target.fullName"
            type="button"
            class="folder-option-item"
            :class="{
              active: currentParent === target.fullName,
              'is-sub-option': target.depth > 0
            }"
            :style="{ paddingLeft: `calc(0.85rem + ${target.depth * 1.15}rem)` }"
            @click="handleSelect(target.fullName)"
          >
            <div class="option-left">
              <span v-if="target.depth > 0" class="sub-tree-branch">└─</span>
              <SvgIcon name="folder" size="14" />
              <span class="option-name">{{ target.baseName }}</span>
              <span v-if="target.parentPath" class="parent-hint">({{ target.parentPath }})</span>
            </div>
            <span v-if="currentParent === target.fullName" class="check-badge">✓ 当前所属</span>
          </button>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn-cancel" @click="$emit('close')">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onUnmounted } from 'vue'
import SvgIcon from './SvgIcon.vue'
import { type BookmarkFolder } from '../pages/state'

const props = defineProps<{
  isOpen: boolean
  folderName: string
  folders: BookmarkFolder[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'move-folder', payload: { folderName: string; targetParent: string | null }): void
}>()

const baseName = computed(() => {
  const parts = props.folderName.split('/')
  return parts[parts.length - 1] || props.folderName
})

const currentParent = computed(() => {
  if (!props.folderName.includes('/')) return null
  return props.folderName.substring(0, props.folderName.lastIndexOf('/'))
})

interface EligibleTarget {
  id: string
  fullName: string
  baseName: string
  parentPath: string | null
  depth: number
}

// 排除当前文件夹自身以及当前文件夹的任何后代文件夹（防循环嵌套）
const eligibleTargets = computed<EligibleTarget[]>(() => {
  if (!props.folders) return []

  const selfName = props.folderName
  const prefix = selfName + '/'

  const filtered = props.folders.filter(f => {
    // 排除自身
    if (f.name === selfName) return false
    // 排除后代
    if (f.name.startsWith(prefix)) return false
    return true
  })

  const mapped = filtered.map(f => {
    const parts = f.name.split('/')
    return {
      id: f.id,
      fullName: f.name,
      baseName: parts[parts.length - 1],
      parentPath: parts.length > 1 ? parts.slice(0, -1).join('/') : null,
      depth: parts.length - 1
    }
  })

  // 按树形自然排序
  mapped.sort((a, b) => a.fullName.localeCompare(b.fullName, 'zh-CN'))
  return mapped
})

const handleSelect = (targetParent: string | null) => {
  emit('move-folder', { folderName: props.folderName, targetParent })
  emit('close')
}

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
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
  padding: 1rem;
  animation: fadeIn 0.15s ease-out;
}

.modal-card {
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 440px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  padding: 1rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-subtle);
}

.header-title-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-main);
}

.modal-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.btn-close {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-close:hover { color: var(--text-main); }

.modal-body {
  padding: 1.15rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.move-hint {
  font-size: 0.8125rem;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.45;
}

.move-hint strong {
  color: var(--text-main);
}

.folder-tree-options {
  max-height: 260px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding-right: 0.25rem;
}

.folder-option-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0.85rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  background-color: var(--bg-surface-subtle);
  color: var(--text-main);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}

.folder-option-item:hover {
  background-color: var(--bg-surface-hover);
  border-color: var(--border-focus);
}

.folder-option-item.active {
  border-color: var(--primary);
  background-color: var(--primary-light, rgba(79, 70, 229, 0.08));
  color: var(--primary);
  font-weight: 600;
}

.option-left {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
  flex: 1;
}

.sub-tree-branch {
  color: var(--text-muted);
  font-family: monospace;
  font-size: 0.8125rem;
  opacity: 0.7;
}

.option-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.parent-hint {
  font-size: 0.6875rem;
  color: var(--text-muted);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  padding: 0.05rem 0.3rem;
  border-radius: var(--radius-xs);
  margin-left: 0.25rem;
  white-space: nowrap;
}

.check-badge {
  font-size: 0.75rem;
  color: var(--primary);
  font-weight: 600;
  white-space: nowrap;
}

.modal-footer {
  padding: 0.75rem 1.25rem;
  background-color: var(--bg-surface-subtle);
  border-top: 1px solid var(--border-subtle);
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.btn-cancel {
  padding: 0.4rem 0.9rem;
  font-size: 0.8125rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  background-color: var(--bg-surface);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
}
.btn-cancel:hover {
  background-color: var(--bg-surface-hover);
  color: var(--text-main);
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}
</style>
