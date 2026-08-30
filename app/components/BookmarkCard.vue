<template>
  <div
    class="bm-rich-card"
    :class="{
      'is-pinned': bookmark.isPinned,
      'is-editing': isEditing,
      'is-dragging': isDragging,
      'is-selected': isSelected,
      'is-select-mode': isSelectMode
    }"
    :draggable="!isSelectMode"
    tabindex="0"
    role="article"
    :aria-label="`书签：${bookmark.title}`"
    @click="handleCardClick"
    @dragstart="!isSelectMode && $emit('dragstart', $event, bookmark)"
    @dragend="!isSelectMode && $emit('dragend')"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
    @touchcancel="handleTouchEnd"
  >
    <div class="bm-header-row">
      <div class="bm-title-area">
        <!-- 批量选择复选框 (点击复选框或其周围区域均可直接选中/取消) -->
        <div
          v-if="isSelectMode"
          class="card-checkbox-box"
          :class="{ 'is-selected': isSelected }"
          title="点击选中/取消此书签"
          @click.stop="$emit('toggle-select', bookmark.id)"
        >
          <input
            type="checkbox"
            :checked="isSelected"
            class="card-checkbox-input"
            aria-label="选择此书签"
            readonly
            tabindex="-1"
          />
        </div>

        <span v-if="bookmark.isPinned" class="pinned-badge" title="已置顶" aria-label="已置顶">
          <SvgIcon name="pin" size="11" />
          <span>置顶</span>
        </span>

        <!-- 文件夹标签 (带一键移出与移动按钮) -->
        <span v-if="bookmark.folder" class="card-folder-tag" :title="`所属分类：${bookmark.folder}`">
          <SvgIcon name="folder" size="11" />
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

        <a :href="bookmark.url" target="_blank" rel="noopener noreferrer" class="bm-main-title" :title="bookmark.title" @click.stop>
          {{ bookmark.title }}
        </a>
      </div>
      <span class="bm-date">{{ displayDate }}</span>
    </div>

    <div class="bm-sub-row">
      <a :href="bookmark.url" target="_blank" rel="noopener noreferrer" class="bm-url-link" :aria-label="`打开网址：${bookmark.url}`" @click.stop>
        <span>{{ bookmark.url }}</span>
        <SvgIcon name="external" size="10" />
      </a>

      <div class="bm-actions-group" @click.stop>
        <!-- 快捷分类按钮 (全端常驻，支持一键为书签归类或切换文件夹) -->
        <button
          type="button"
          class="action-pill-btn btn-action-classify"
          title="点击为书签分配或更改文件夹分类"
          aria-label="将此书签归入文件夹"
          @click.stop="$emit('open-mobile-folder-select', bookmark)"
        >
          <SvgIcon name="folder" size="11" />
          <span>分类</span>
        </button>

        <button
          type="button"
          class="action-pill-btn"
          :class="{ active: bookmark.isPinned }"
          :title="bookmark.isPinned ? '取消置顶' : '置顶此书签'"
          :aria-label="bookmark.isPinned ? '取消置顶' : '置顶此书签'"
          @click.stop="$emit('toggle-pin', bookmark.id)"
        >
          <SvgIcon name="pin" size="11" />
          <span>{{ bookmark.isPinned ? '取消置顶' : '置顶' }}</span>
        </button>

        <button
          v-if="!isEditing"
          type="button"
          class="action-pill-btn"
          title="直接在此卡片上编辑总结"
          aria-label="编辑总结内容"
          @click.stop="$emit('start-inline-edit', bookmark)"
        >
          <SvgIcon name="edit" size="11" />
          <span>编辑</span>
        </button>

        <button
          type="button"
          class="action-pill-btn btn-danger-text"
          title="删除此书签"
          aria-label="删除此书签"
          @click.stop="$emit('delete', bookmark.id)"
        >
          <SvgIcon name="trash" size="11" />
          <span>删除</span>
        </button>
      </div>
    </div>

    <!-- 内联直接编辑总结模式 -->
    <div v-if="isEditing" class="inline-edit-container" @click.stop>
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
          <SvgIcon name="check" size="14" />
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
        <div class="features-content" v-html="formatInlineMd(features)"></div>
      </div>

      <div v-if="actions.length" class="summary-actions-box">
        <div class="actions-heading">🎯 待办行动指南</div>
        <div class="actions-list">
          <div v-for="(act, idx) in actions" :key="idx" class="action-item-row">
            <span class="action-bullet">• [ ]</span>
            <span class="action-text" v-html="formatInlineMd(act)"></span>
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
import SvgIcon from './SvgIcon.vue'
import { ICONS, type Bookmark } from '../pages/state'

const props = withDefaults(
  defineProps<{
    bookmark: Bookmark
    isEditing: boolean
    editText: string
    isDragging: boolean
    isSelectMode?: boolean
    isSelected?: boolean
  }>(),
  {
    isSelectMode: false,
    isSelected: false
  }
)

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
  (e: 'toggle-select', bmId: string): void
}>()

const handleCardClick = () => {
  if (props.isSelectMode) {
    emit('toggle-select', props.bookmark.id)
  }
}

// 移动端长按检测机制 (> 450ms 触发长按添加到文件夹)
let touchTimer: any = null
let touchMoved = false

const handleTouchStart = () => {
  if (props.isSelectMode) return
  touchMoved = false
  if (touchTimer) clearTimeout(touchTimer)
  touchTimer = setTimeout(() => {
    if (!touchMoved) {
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
    .map(line => {
      return line
        .replace(/^[\s\*\-\•]*\*{0,2}\[\s*\]\*{0,2}\s*/, '')
        .replace(/^[\s\*\-\•]+\s*/, '')
        .trim()
    })
    .filter(Boolean)
})

const formatInlineMd = (textSource: string) => {
  if (!textSource) return ''
  let text = textSource
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>')
  text = text.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>')
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>')
  text = text.replace(/\n/g, '<br/>')
  return text
}

const displayDate = computed(() => {
  if (!props.bookmark.createdAt) return ''
  const d = new Date(props.bookmark.createdAt)
  if (isNaN(d.getTime())) return props.bookmark.createdAt
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
})
</script>

<style scoped>
.bm-rich-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  padding: 1.15rem;
  box-shadow: var(--shadow-sm);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  outline: none;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  overflow: hidden;
  word-break: break-word;
}

.bm-rich-card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--border-strong);
  transform: translateY(-1px);
}

.bm-rich-card.is-selected {
  border-color: var(--text-main);
  background-color: var(--bg-surface-subtle);
  box-shadow: 0 0 0 2px var(--text-main);
}

.bm-rich-card.is-select-mode {
  cursor: pointer;
}

.bm-rich-card.is-pinned {
  border-left: 3px solid var(--primary);
}

.bm-rich-card.is-dragging {
  opacity: 0.4;
  transform: scale(0.98);
}

.card-checkbox-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: 0.35rem;
  padding: 0.25rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}
.card-checkbox-box:hover {
  background-color: rgba(0, 0, 0, 0.06);
}
.dark .card-checkbox-box:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.card-checkbox-input {
  width: 17px;
  height: 17px;
  cursor: pointer;
  accent-color: var(--primary);
  pointer-events: none;
}

.bm-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  width: 100%;
  min-width: 0;
}

.bm-title-area {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.45rem;
  flex: 1 1 0;
  min-width: 0;
  max-width: 100%;
}

.pinned-badge {
  font-size: 0.7rem;
  padding: 0.15rem 0.45rem;
  background-color: var(--primary);
  color: var(--primary-contrast);
  border-radius: var(--radius-sm);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

.card-folder-tag {
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  background-color: var(--bg-surface-subtle);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
  max-width: 100%;
}

.folder-tag-name {
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.folder-tag-name:hover {
  color: var(--text-main);
  text-decoration: underline;
}

.tag-remove-folder-btn {
  background: transparent;
  border: none;
  color: var(--text-subtle);
  cursor: pointer;
  padding: 0 0.15rem;
  font-size: 0.85rem;
  line-height: 1;
  flex-shrink: 0;
}
.tag-remove-folder-btn:hover {
  color: var(--danger);
}

.bm-main-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-main);
  text-decoration: none;
  word-break: break-word;
  overflow-wrap: anywhere;
  min-width: 0;
  max-width: 100%;
}
.bm-main-title:hover {
  color: var(--primary);
  text-decoration: underline;
}

.bm-date {
  font-size: 0.75rem;
  color: var(--text-subtle);
  white-space: nowrap;
  flex-shrink: 0;
}

.bm-sub-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  width: 100%;
  min-width: 0;
}

.bm-url-link {
  font-size: 0.775rem;
  color: var(--text-muted);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  max-width: 60%;
  min-width: 0;
  overflow: hidden;
}
.bm-url-link span:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  flex: 1 1 auto;
}
.bm-url-link:hover {
  color: var(--primary);
  text-decoration: underline;
}

.bm-actions-group {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.action-pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  padding: 0.2rem 0.55rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
  background-color: var(--bg-surface-subtle);
  color: var(--text-muted);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
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
  word-break: break-word;
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
  flex-wrap: wrap;
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
  line-height: 1.45;
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
  white-space: pre-wrap;
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
  color: var(--text-subtle);
  font-weight: 600;
  flex-shrink: 0;
}

.action-text {
  color: var(--text-muted);
  line-height: 1.5;
}

.action-text :deep(strong),
.features-content :deep(strong) {
  font-weight: 600;
  color: var(--text-main);
}

.bm-summary-empty {
  font-size: 0.8125rem;
  color: var(--text-subtle);
  padding: 0.5rem;
  text-align: center;
}

@media (max-width: 768px) {
  .bm-rich-card {
    padding: 1rem !important;
    box-sizing: border-box !important;
  }

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
