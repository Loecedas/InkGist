<template>
  <div v-if="modelValue" class="modal-backdrop" @click.self="closeModal">
    <div class="bookmarklet-modal-card" role="dialog" aria-modal="true" aria-labelledby="bookmarklet-modal-title">
      <!-- 弹窗头部 -->
      <div class="modal-header">
        <div class="modal-title-group">
          <div>
            <h3 id="bookmarklet-modal-title" class="modal-title">浏览器小书签 (Bookmarklet)</h3>
            <p class="modal-subtitle">在任意网页点击书签，一键直达墨萃并自动生成 AI 深度总结</p>
          </div>
        </div>
        <button class="btn-flat btn-icon close-btn" title="关闭弹窗" @click="closeModal">
          <svg class="svg-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.close"></svg>
        </button>
      </div>

      <!-- 核心小书签拖拽与复制区域 -->
      <div class="modal-body">
        <div class="drag-action-hero">
          <div class="drag-badge-label">
            <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.pin"></svg>
            <span>电脑端：按住下方按钮直接拖拽到浏览器书签栏</span>
          </div>

          <!-- 可拖拽的书签链接 -->
          <div class="bookmarklet-link-wrapper">
            <a
              :href="bookmarkletCode"
              class="bookmarklet-pill-link"
              title="按住鼠标左键，直接拖拽此按钮到您的浏览器书签栏"
              @click.prevent="handleLinkClick"
            >
              <span>📌 墨萃 · 一键总结</span>
            </a>
          </div>

          <p v-if="clickTipVisible" class="click-warning-tip">
            💡 请按住上方按钮并<strong>拖拽到浏览器书签栏</strong>，而不是直接点击哦！
          </p>
        </div>

        <!-- 备选：复制脚本代码 -->
        <div class="code-copy-section">
          <div class="section-title-row">
            <span class="section-title">无法拖拽或手机端使用？复制代码手动添加：</span>
            <button
              class="btn-secondary btn-sm copy-btn"
              :title="copied ? '已复制到剪贴板' : '复制书签脚本代码'"
              @click="copyBookmarkletCode"
            >
              <svg class="svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="copied ? ICONS.check : ICONS.copy"></svg>
              <span class="copy-btn-text">{{ copied ? '已复制代码' : '复制代码' }}</span>
            </button>
          </div>
          <div class="code-preview-box">
            <code>{{ bookmarkletCode }}</code>
          </div>
        </div>

        <!-- 详细使用指引 -->
        <div class="instructions-container">
          <h4 class="guide-title">使用步骤指南</h4>
          <div class="steps-grid">
            <div class="step-card">
              <div class="step-num">1</div>
              <div class="step-content">
                <strong>安装小书签</strong>
                <span>显示浏览器书签栏（按 <code>Ctrl+Shift+B</code> 或 Mac <code>Cmd+Shift+B</code>），将上方胶囊按钮拖入书签栏。</span>
              </div>
            </div>

            <div class="step-card">
              <div class="step-num">2</div>
              <div class="step-content">
                <strong>浏览任意网页</strong>
                <span>在阅读 GitHub、掘金、知乎、微信文章、新闻资讯或任何文章时，只需点击书签栏上的小书签。</span>
              </div>
            </div>

            <div class="step-card">
              <div class="step-num">3</div>
              <div class="step-content">
                <strong>自动智能总结</strong>
                <span>墨萃将在新标签页打开，自动填入网址并即刻开始深度提炼，一键直达核心精华！</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部关闭按钮 -->
      <div class="modal-footer">
        <button class="btn-primary" @click="closeModal">我知道了</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ICONS } from '../pages/state'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
}>()

const copied = ref(false)
const clickTipVisible = ref(false)
const siteOrigin = ref('')

onMounted(() => {
  if (typeof window !== 'undefined') {
    siteOrigin.value = window.location.origin
    window.addEventListener('keydown', handleKeyDown)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeyDown)
  }
})

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.modelValue) {
    closeModal()
  }
}

const bookmarkletCode = computed(() => {
  const origin = siteOrigin.value || (typeof window !== 'undefined' ? window.location.origin : '')
  return `javascript:(function(){function r(){var u=window.location.href;if(!u||u==='about:blank'||!/^https?:\\/\\//i.test(u)){alert('请等待网页加载完成，或在有效的网页中点击小书签');return;}var t=document.title||'';var target='${origin}/?url='+encodeURIComponent(u)+(t?'&title='+encodeURIComponent(t):'')+'&auto=1';window.open(target,'_blank');}if(document.readyState==='loading'){var tm=setTimeout(r,1000);window.addEventListener('DOMContentLoaded',function(){clearTimeout(tm);r();},{once:true});}else{r();}})();`
})

const closeModal = () => {
  clickTipVisible.value = false
  emit('update:modelValue', false)
}

const handleLinkClick = () => {
  clickTipVisible.value = true
  setTimeout(() => {
    clickTipVisible.value = false
  }, 4000)
}

const copyBookmarkletCode = async () => {
  const code = bookmarkletCode.value
  if (!code) return
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(code)
      copied.value = true
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = code
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      textarea.style.top = '-9999px'
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      const successful = document.execCommand('copy')
      document.body.removeChild(textarea)
      if (successful) copied.value = true
    }
    setTimeout(() => {
      copied.value = false
    }, 2500)
  } catch (err) {
    console.error('Failed to copy bookmarklet code:', err)
  }
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
  animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.bookmarklet-modal-card {
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-modal);
  display: flex;
  flex-direction: column;
  animation: scaleUp 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1.25rem 1.5rem 1rem;
  border-bottom: 1px solid var(--border-subtle);
}

.modal-title-group {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.modal-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-main);
  line-height: 1.3;
}

.modal-subtitle {
  font-size: 0.8125rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
  line-height: 1.4;
}

.close-btn {
  color: var(--text-subtle);
  margin-top: -0.25rem;
  margin-right: -0.5rem;
}
.close-btn:hover {
  color: var(--text-main);
}

.modal-body {
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.drag-action-hero {
  background: var(--bg-surface-subtle);
  border: 1.5px dashed var(--border-strong);
  border-radius: var(--radius-lg);
  padding: 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.875rem;
  text-align: center;
}

.drag-badge-label {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  color: var(--text-muted);
  font-weight: 500;
}

.bookmarklet-link-wrapper {
  margin: 0.25rem 0;
}

.bookmarklet-pill-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: var(--primary);
  color: var(--primary-contrast);
  border-radius: var(--radius-full);
  font-size: 1rem;
  font-weight: 600;
  text-decoration: none;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.18);
  cursor: grab;
  user-select: none;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.bookmarklet-pill-link:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.25);
  background: var(--primary-hover);
}

.bookmarklet-pill-link:active {
  cursor: grabbing;
  transform: translateY(0);
}

.click-warning-tip {
  font-size: 0.8125rem;
  color: #b45309;
  background: #fef3c7;
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-sm);
  animation: fadeIn 0.2s ease;
}

html.dark .click-warning-tip {
  color: #fef3c7;
  background: rgba(180, 83, 9, 0.3);
}

.code-copy-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.section-title {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-muted);
}

.copy-btn {
  font-size: 0.75rem;
  padding: 0.3rem 0.6rem;
}

.code-preview-box {
  background: var(--bg-surface-subtle);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 0.6rem 0.875rem;
  max-height: 60px;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
}

.code-preview-box code {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-muted);
}

.instructions-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.guide-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-main);
}

.steps-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.step-card {
  background: var(--bg-surface-subtle);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.step-num {
  width: 22px;
  height: 22px;
  border-radius: var(--radius-full);
  background: var(--primary);
  color: var(--primary-contrast);
  font-size: 0.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.step-content strong {
  font-size: 0.8125rem;
  color: var(--text-main);
}

.step-content span {
  font-size: 0.75rem;
  color: var(--text-muted);
  line-height: 1.4;
}

.step-content code {
  background: var(--border-subtle);
  padding: 0.1rem 0.25rem;
  border-radius: var(--radius-xs);
  font-size: 0.7rem;
}

.modal-footer {
  padding: 0.875rem 1.5rem;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  justify-content: flex-end;
  background: var(--bg-surface-subtle);
  border-bottom-left-radius: var(--radius-xl);
  border-bottom-right-radius: var(--radius-xl);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleUp {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(6px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@media (max-width: 640px) {
  /* 375 和 425 移动端尺寸下仅显示图标 */
  .copy-btn .copy-btn-text {
    display: none;
  }
  .copy-btn {
    padding: 0.35rem;
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .steps-grid {
    grid-template-columns: 1fr;
  }
  .modal-body {
    padding: 1rem;
  }
}
</style>
