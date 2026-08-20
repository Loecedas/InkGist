<template>
  <div
    class="bm-rich-card"
    :class="{ 'is-pinned': bookmark.isPinned, 'is-editing': isEditing, 'is-dragging': isDragging }"
    draggable="true"
    tabindex="0"
    role="article"
    :aria-label="`书签：${bookmark.title}`"
    @dragstart="$emit('dragstart', $event, bookmark)"
    @dragend="$emit('dragend')"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
    @touchcancel="handleTouchEnd"
  >
    <div class="bm-header-row">
      <div class="bm-title-area">
        <span v-if="bookmark.isPinned" class="pinned-badge" title="已置顶" aria-label="已置顶">📌 置顶</span>

        <!-- 文件夹标签 (带一键移出与移动按钮) -->
        <span v-if="bookmark.folder" class="card-folder-tag" :title="`所属分类：${bookmark.folder}`">
          <svg class="svg-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.folder"></svg>
          <span class="folder-tag-name" @click.stop="$emit('filter-folder', bookmark.folder)">{{ bookmark.folder }}</span>
          <button
            type="button"
            class="tag-remove-folder-btn"
            title="从该分类中移出"
            :aria-label="`将此书签从分类 ${bookmark.folder} 中移出`"
            @click.stop.prevent="$emit('remove-from-folder', bookmark.id, bookmark.folder)"
          >
            ×
          </button>
        </span>

        <a :href="bookmark.url" target="_blank" rel="noopener noreferrer" class="bm-main-title" :title="bookmark.title">
          {{ bookmark.title }}
        </a>
      </div>
      <span class="bm-date">{{ displayDate }}</span>
    </div>

    <div class="bm-sub-row">
      <a :href="bookmark.url" target="_blank" rel="noopener noreferrer" class="bm-url-link" :aria-label="`打开网址：${bookmark.url}`">
        <span>{{ bookmark.url }}</span>
        <span style="font-size: 11px;">↗</span>
      </a>

      <div class="bm-actions-group">
        <!-- 移动端专属：快捷移入文件夹按钮 -->
        <button
          type="button"
          class="action-pill-btn btn-mobile-move-folder"
          title="长按卡片或点击此将书签归入文件夹"
          aria-label="将此书签归入文件夹"
          @click.stop="$emit('open-mobile-folder-select', bookmark)"
        >
          <span>📁 分类</span>
        </button>

        <button
          type="button"
          class="action-pill-btn"
          :class="{ active: bookmark.isPinned }"
          :title="bookmark.isPinned ? '取消置顶' : '置顶此书签'"
          :aria-label="bookmark.isPinned ? '取消置顶' : '置顶此书签'"
          @click.stop="$emit('toggle-pin', bookmark.id)"
        >
          <span>📌 {{ bookmark.isPinned ? '取消置顶' : '置顶' }}</span>
        </button>

        <button
          v-if="!isEditing"
          type="button"
          class="action-pill-btn"
          title="直接在此卡片上编辑总结"
          aria-label="编辑总结内容"
          @click.stop="$emit('start-inline-edit', bookmark)"
        >
          <span>✏️ 编辑</span>
        </button>

        <button
          type="button"
          class="action-pill-btn btn-danger-text"
          title="删除此书签"
          aria-label="删除此书签"
          @click.stop="$emit('delete', bookmark.id)"
        >
          <span>🗑️ 删除</span>
        </button>
      </div>
    </div>

    <!-- 内联直接编辑总结模式 -->
    <div v-if="isEditing" class="inline-edit-container">
      <div class="inline-edit-header">
        <span class="edit-hint-label">✏️ 直接编辑总结文字 (支持 Markdown)：</span>
      </div>
      <textarea
        :value="editText"
        class="inline-textarea"
        rows="9"
        placeholder="直接编辑总结内容..."
        aria-label="编辑总结内容"
        @input="$emit('update-edit-text', ($event.target as HTMLTextAreaElement).value)"
      ></textarea>
      <div class="inline-actions-row">
        <button type="button" class="btn-secondary btn-sm" aria-label="取消编辑" @click="$emit('cancel-inline-edit')">取消</button>
        <button type="button" class="btn-primary btn-sm" aria-label="保存编辑更改" @click="$emit('save-inline-edit', bookmark.id)">
          <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.check"></svg>
          <span>保存更改</span>
        </button>
      </div>
    </div>

    <!-- 总结主体展示 -->
    <div v-else-if="bookmark.summary || bookmark.description" class="bm-summary-body">
      <div class="summary-badge-header">
        <span class="assistant-badge">🚀 链接总结助手 | {{ bookmark.title }}</span>
      </div>

      <div class="summary-meta-list">
        <div v-if="oneLiner" class="meta-item-row">
          <span class="meta-dot green-dot"></span>
          <span class="meta-label">一句话概括:</span>
          <span class="meta-val">{{ oneLiner }}</span>
        </div>

        <div v-if="cleanTags.length" class="meta-item-row">
          <span class="meta-dot green-dot"></span>
          <span class="meta-label">智能标签:</span>
          <div class="tags-pill-list">
            <span v-for="tag in cleanTags" :key="tag" class="tag-pill">{{ tag }}</span>
          </div>
        </div>
      </div>

      <div v-if="features" class="summary-features-box">
        <div class="features-heading">📕 核心功能说明</div>
        <div class="features-content">{{ features }}</div>
      </div>

      <div v-if="actions.length" class="summary-actions-box">
        <div class="actions-heading">🎯 待办行动指南</div>
        <div class="actions-list">
          <div v-for="(act, idx) in actions" :key="idx" class="action-item-row">
            <span class="action-bullet">[ ]</span>
            <span class="action-text">{{ act }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="bm-summary-empty">
      <span>暂无 AI 总结详细内容</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ICONS, type Bookmark } from '../pages/state'

const props = defineProps<{
  bookmark: Bookmark
  isEditing: boolean
  editText: string
  isDragging: boolean
}>()

const emit = defineEmits<{
  (e: 'dragstart', ev: DragEvent, bm: Bookmark): void
  (e: 'dragend'): void
  (e: 'long-press', bm: Bookmark): void
  (e: 'open-mobile-folder-select', bm: Bookmark): void
  (e: 'filter-folder', folderName: string): void
  (e: 'remove-from-folder', bmId: string, folderName: string): void
  (e: 'toggle-pin', bmId: string): void
  (e: 'start-inline-edit', bm: Bookmark): void
  (e: 'cancel-inline-edit'): void
  (e: 'save-inline-edit', bmId: string): void
  (e: 'update-edit-text', val: string): void
  (e: 'delete', bmId: string): void
}>()

// 移动端长按检测机制 (> 450ms 触发长按添加到文件夹)
let touchTimer: any = null
let touchMoved = false

const handleTouchStart = () => {
  touchMoved = false
  if (touchTimer) clearTimeout(touchTimer)
  touchTimer = setTimeout(() => {
    if (!touchMoved) {
      // 触发长按振动反馈 (若支持)
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(50) } catch {}
      }
      emit('long-press', props.bookmark)
    }
  }, 450)
}

const handleTouchEnd = () => {
  if (touchTimer) clearTimeout(touchTimer)
}

const cleanTags = computed(() => {
  const list: string[] = []
  if (props.bookmark.summary) {
    const match = props.bookmark.summary.match(/\*\s*\*\*智能标签\*\*[：:]\s*(.+)/i)
    if (match && match[1]) {
      const tag = match[1].replace(/[`\*]/g, '').trim()
      if (tag && !list.includes(tag)) list.push(tag)
    }
  }
  if (props.bookmark.tags && props.bookmark.tags.length) {
    for (const t of props.bookmark.tags) {
      if (!/AI总结|Defuddle|Jina|智谱|DeepSeek|Gemini|抓取|模型/i.test(t)) {
        if (!list.includes(t)) list.push(t)
      }
    }
  }
  return list
})

const oneLiner = computed(() => {
  if (!props.bookmark.summary) return props.bookmark.description || ''
  const match = props.bookmark.summary.match(/\*\s*\*\*一句话概括\*\*[：:]\s*(.+)/i)
  if (match && match[1]) return match[1].replace(/[`\*]/g, '').trim()
  return props.bookmark.description || ''
})

const features = computed(() => {
  if (!props.bookmark.summary) return props.bookmark.description || ''
  const match = props.bookmark.summary.match(/###\s*📕?\s*核心功能说明\s*\n+([\s\S]*?)(?=\n+---|###|🎯|$)/i)
  if (match && match[1]) return match[1].trim()
  return props.bookmark.description || ''
})

const actions = computed(() => {
  if (!props.bookmark.summary) return []
  const match = props.bookmark.summary.match(/###\s*🎯?\s*待办行动指南[^\n]*\n+([\s\S]*?)(?=\n+---|###|$)/i)
  if (!match || !match[1]) return []
  return match[1]
    .split('\n')
    .map(line => line.replace(/^[\s\*\-\•]*\[\s*\]\s*/, '').trim())
    .filter(Boolean)
})

const displayDate = computed(() => {
  const raw = props.bookmark.createdAt
  if (!raw) {
    const d = new Date()
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
  }
  try {
    const d = new Date(raw)
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}/${month}/${day}`
    }
  } catch {}
  return String(raw).replace(/-/g, '/')
})
</script>

<style scoped>
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

.folder-tag-name {
  cursor: pointer;
}
.folder-tag-name:hover {
  color: var(--primary);
  text-decoration: underline;
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
  white-space: nowrap;
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

.btn-mobile-move-folder {
  display: none;
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

@media (max-width: 768px) {
  .btn-mobile-move-folder {
    display: inline-flex;
  }
}

@media (max-width: 480px) {
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
</style>
