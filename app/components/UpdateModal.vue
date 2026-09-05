<template>
  <div v-if="isModalOpen" class="modal-backdrop" @click.self="closeUpdateModal">
    <div class="update-modal-card" role="dialog" aria-modal="true">
      <!-- 弹窗头部 -->
      <div class="modal-header">
        <div class="header-title-group">
          <div class="modal-header-icon-box">
            <svg class="svg-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.sparkles"></svg>
          </div>
          <div>
            <h3 class="modal-title">墨萃系统更新</h3>
            <p class="modal-subtitle">检测与获取官方主仓库最新功能与优化</p>
          </div>
        </div>

        <button class="modal-close-btn" title="关闭 (Esc)" @click="closeUpdateModal">
          <svg class="svg-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.close"></svg>
        </button>
      </div>

      <!-- 弹窗主体滚动区 -->
      <div class="modal-body-scroll">
        <!-- 1. 版本状态对比卡片 -->
        <div class="version-banner-card" :class="{ 'has-new-version': versionInfo.hasUpdate }">
          <div class="version-status-row">
            <div class="version-badge-box">
              <span class="version-label">当前运行版本</span>
              <div class="version-val-row">
                <strong class="version-val">v{{ versionInfo.currentVersion }}</strong>
                <span v-if="versionInfo.currentCommit" class="commit-tag">#{{ versionInfo.currentCommit }}</span>
              </div>
            </div>

            <div class="version-arrow-icon">
              <svg class="svg-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.arrowRight"></svg>
            </div>

            <div class="version-badge-box">
              <span class="version-label">官方最新版本</span>
              <div class="version-val-row">
                <strong class="version-val latest">v{{ versionInfo.latestVersion }}</strong>
                <span v-if="versionInfo.latestCommit && versionInfo.latestCommit !== versionInfo.currentCommit" class="commit-tag latest">#{{ versionInfo.latestCommit }}</span>
              </div>
            </div>
          </div>

          <div class="version-status-footer">
            <div class="status-pill" :class="versionInfo.hasUpdate ? 'status-update-available' : 'status-up-to-date'">
              <span class="status-dot"></span>
              <span>{{ versionInfo.hasUpdate ? '发现可用新版本' : '当前已是官方最新版本' }}</span>
            </div>

            <button
              class="refresh-check-btn"
              :disabled="isChecking || isUpdating"
              title="重新向 GitHub 检查最新版本"
              @click="checkUpdate(true)"
            >
              <svg class="svg-icon" :class="{ 'is-spinning': isChecking }" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.sync"></svg>
              <span>{{ isChecking ? '正在检查...' : '检查更新' }}</span>
            </button>
          </div>
        </div>

        <!-- 2. 更新日志视窗 (支持 Markdown 渲染且隐藏滚动条) -->
        <div class="release-notes-section" v-if="versionInfo.releaseNotes">
          <div class="section-title-row">
            <span class="section-title">最新更新内容 (Release Notes)</span>

            <a
              :href="versionInfo.releaseUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="github-release-link"
              title="前往 GitHub 查看 Release 详情"
            >
              <svg class="svg-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.external"></svg>
              <span>GitHub 发布页</span>
            </a>
          </div>

          <div class="release-notes-box">
            <div class="markdown-body notes-content" v-html="renderedMarkdown"></div>
          </div>
        </div>

        <!-- 3. 更新日志终端输出 (执行更新中或更新完成后展示) -->
        <div class="update-logs-section" v-if="updateLogs.length > 0 || isUpdating">
          <div class="section-title-row">
            <span class="section-title">升级执行控制台</span>
            <span v-if="isUpdating" class="running-indicator">正在执行中...</span>
          </div>

          <div class="logs-console-box">
            <div v-for="(log, idx) in updateLogs" :key="idx" class="log-item" :class="`log-status-${log.status}`">
              <div class="log-header-line">
                <span class="log-step-tag">{{ log.timestamp }}</span>
                <span class="log-step-title">{{ log.message }}</span>
              </div>
              <pre v-if="log.output" class="log-output-detail">{{ log.output }}</pre>
            </div>
          </div>
        </div>

        <!-- 4. 更新完成成功横幅 -->
        <div v-if="updateResult && updateResult.success" class="update-success-banner">
          <div class="success-icon-box">
            <svg class="svg-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.check"></svg>
          </div>
          <div class="success-text-box">
            <strong>升级执行成功！</strong>
            <p>项目代码与静态资源已全部同步，请点击下方按钮刷新浏览器页面。</p>
          </div>
          <button class="reload-page-btn" @click="handleReload">
            <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.refresh"></svg>
            <span>立即刷新页面</span>
          </button>
        </div>

        <!-- 5. 常见部署环境更新指南 (折叠/多标签) -->
        <div class="deployment-guides-section">
          <div class="section-title-row">
            <span class="section-title">不同部署方式升级指南</span>
            <span class="guide-tip-text">如无法在线升级，可选用下方对应命令</span>
          </div>

          <div class="guide-tabs-row">
            <button
              v-for="tab in guideTabs"
              :key="tab.id"
              class="guide-tab-btn"
              :class="{ active: activeGuideTab === tab.id }"
              @click="activeGuideTab = tab.id"
            >
              {{ tab.label }}
            </button>
          </div>

          <div class="guide-content-box">
            <div class="command-block-row">
              <code>{{ currentGuideCommand }}</code>
              <button class="copy-cmd-btn" @click="copyCommand(currentGuideCommand)">
                <svg class="svg-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="cmdCopied ? ICONS.check : ICONS.copy"></svg>
                <span>{{ cmdCopied ? '已复制' : '复制命令' }}</span>
              </button>
            </div>
            <p class="guide-explanation">{{ currentGuideDesc }}</p>
          </div>
        </div>
      </div>

      <!-- 弹窗底部操作栏 -->
      <div class="modal-footer">
        <div class="footer-left-options">
          <label class="auto-check-toggle" title="每次打开墨萃时自动检测是否有新版本发布">
            <input
              type="checkbox"
              :checked="autoCheckEnabled"
              @change="toggleAutoCheck"
            />
            <span>启动时自动检查更新</span>
          </label>
        </div>

        <div class="footer-right-actions">
          <button class="btn-cancel" @click="closeUpdateModal">
            {{ updateResult?.success ? '稍后关闭' : '关闭' }}
          </button>

          <!-- 一键在线升级大按钮 -->
          <button
            v-if="versionInfo.hasUpdate && !updateResult?.success"
            class="btn-upgrade-now"
            :disabled="isUpdating"
            @click="executeUpdate"
          >
            <svg class="svg-icon" :class="{ 'is-spinning': isUpdating }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="isUpdating ? ICONS.sync : ICONS.zap"></svg>
            <span>{{ isUpdating ? '正在升级中...' : '立即在线升级' }}</span>
          </button>

          <button
            v-else-if="updateResult?.success"
            class="btn-upgrade-now is-success-action"
            @click="handleReload"
          >
            <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.refresh"></svg>
            <span>刷新页面完成更新</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { ICONS } from '../pages/state'
import { useUpdater } from '../utils/updater'

const {
  versionInfo,
  isChecking,
  isUpdating,
  updateLogs,
  updateResult,
  autoCheckEnabled,
  isModalOpen,
  setAutoCheck,
  closeUpdateModal,
  checkUpdate,
  executeUpdate
} = useUpdater()

const cmdCopied = ref(false)
const activeGuideTab = ref<'git' | 'docker' | 'panel'>('git')

const renderedMarkdown = computed(() => {
  const notes = versionInfo.value.releaseNotes || ''
  try {
    const rawHtml = marked.parse(notes, { gfm: true, breaks: true }) as string
    if (typeof window !== 'undefined' && DOMPurify && typeof DOMPurify.sanitize === 'function') {
      return DOMPurify.sanitize(rawHtml)
    }
    return rawHtml
  } catch {
    return notes
  }
})

const guideTabs = [
  { id: 'git', label: 'Git / Node 部署' },
  { id: 'docker', label: 'Docker 容器' },
  { id: 'panel', label: '1Panel / 宝塔面板' }
] as const

const currentGuideCommand = computed(() => {
  if (activeGuideTab.value === 'docker') {
    return 'docker compose pull && docker compose up -d'
  }
  if (activeGuideTab.value === 'panel') {
    return 'git pull && npm install && npm run build && pm2 restart inkgist'
  }
  return 'git pull origin main && npm install && npm run build'
})

const currentGuideDesc = computed(() => {
  if (activeGuideTab.value === 'docker') {
    return 'Docker 环境下运行上述指令拉取最新镜像并平滑重建容器；若配置了 containrrr/watchtower，容器可全自动静默升级。'
  }
  if (activeGuideTab.value === 'panel') {
    return '在面板的项目根目录执行该指令，自动拉取最新源码并重载 Node.js 进程。'
  }
  return '在服务器项目目录下执行上述命令，自动同步官方主仓库最新功能并编译。'
})

const copyCommand = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    cmdCopied.value = true
    setTimeout(() => {
      cmdCopied.value = false
    }, 2000)
  } catch {}
}

const toggleAutoCheck = (e: Event) => {
  const target = e.target as HTMLInputElement
  setAutoCheck(target.checked)
}

const handleReload = () => {
  if (typeof window !== 'undefined') {
    window.location.reload()
  }
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background-color: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: fadeIn 0.15s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.update-modal-card {
  width: 100%;
  max-width: 640px;
  max-height: 90vh;
  background-color: var(--bg-surface, #ffffff);
  border: 1px solid var(--border-subtle, #e2e8f0);
  border-radius: var(--radius-lg, 16px);
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  animation: modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalPop {
  from { opacity: 0; transform: scale(0.96) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

/* 头部 */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-subtle, #e2e8f0);
}

.header-title-group {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.modal-header-icon-box {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--primary-subtle, rgba(59, 130, 246, 0.12));
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.modal-title {
  margin: 0;
  font-size: 1.0625rem;
  font-weight: 700;
  color: var(--text-main);
  line-height: 1.3;
}

.modal-subtitle {
  margin: 0.15rem 0 0;
  font-size: 0.775rem;
  color: var(--text-muted);
}

.modal-close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
}

.modal-close-btn:hover {
  background: var(--bg-surface-subtle);
  color: var(--text-main);
}

/* 滚动区 */
.modal-body-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* 版本对比卡片 */
.version-banner-card {
  background: var(--bg-surface-subtle, #f8fafc);
  border: 1px solid var(--border-subtle, #e2e8f0);
  border-radius: var(--radius-md, 12px);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: all 0.2s ease;
}

.version-banner-card.has-new-version {
  border-color: rgba(59, 130, 246, 0.4);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, var(--bg-surface-subtle) 100%);
}

.version-status-row {
  display: flex;
  align-items: center;
  justify-content: space-around;
  gap: 1rem;
}

.version-badge-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
}

.version-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 500;
}

.version-val-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.version-val {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text-main);
  letter-spacing: -0.02em;
}

.version-val.latest {
  color: var(--primary);
}

.commit-tag {
  font-size: 0.6875rem;
  font-family: monospace;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
}

.commit-tag.latest {
  background: rgba(59, 130, 246, 0.12);
  color: var(--primary);
  border-color: rgba(59, 130, 246, 0.3);
}

.version-arrow-icon {
  color: var(--text-subtle);
}

.version-status-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.85rem;
  border-top: 1px solid var(--border-subtle);
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.2rem 0.65rem;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 600;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.status-up-to-date {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}
.status-up-to-date .status-dot {
  background: #10b981;
}

.status-update-available {
  background: rgba(59, 130, 246, 0.15);
  color: var(--primary);
}
.status-update-available .status-dot {
  background: var(--primary);
  box-shadow: 0 0 6px var(--primary);
}

.refresh-check-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.65rem;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 500;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
}

.refresh-check-btn:hover:not(:disabled) {
  background: var(--bg-surface-hover);
  color: var(--text-main);
  border-color: var(--border-strong);
}

.is-spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 更新日志区 */
.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.section-title {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--text-main);
}

.github-release-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--text-muted);
  text-decoration: none;
}

.github-release-link:hover {
  color: var(--primary);
}

.release-notes-box {
  background: var(--bg-surface-subtle);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 0.85rem 1.1rem;
  max-height: 200px;
  overflow-y: auto;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE / Edge */
}

.release-notes-box::-webkit-scrollbar {
  display: none; /* Chrome / Safari / Opera */
}

.notes-content {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: var(--text-main);
  word-break: break-word;
}

.notes-content :deep(h1),
.notes-content :deep(h2),
.notes-content :deep(h3),
.notes-content :deep(h4) {
  font-weight: 700;
  color: var(--text-main);
  margin-top: 0.75rem;
  margin-bottom: 0.35rem;
  line-height: 1.35;
}

.notes-content :deep(h1) { font-size: 0.95rem; }
.notes-content :deep(h2) { font-size: 0.875rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.2rem; }
.notes-content :deep(h3) { font-size: 0.825rem; }
.notes-content :deep(h4) { font-size: 0.8rem; }

.notes-content :deep(p) {
  margin: 0.35rem 0;
}

.notes-content :deep(ul),
.notes-content :deep(ol) {
  padding-left: 1.25rem;
  margin: 0.35rem 0;
}

.notes-content :deep(li) {
  margin-bottom: 0.25rem;
}

.notes-content :deep(pre) {
  background: #0f172a;
  color: #f8fafc;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-sm);
  font-family: monospace;
  font-size: 0.75rem;
  overflow-x: auto;
  margin: 0.5rem 0;
  scrollbar-width: none;
}
.notes-content :deep(pre)::-webkit-scrollbar {
  display: none;
}

.notes-content :deep(code) {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--primary);
  font-family: monospace;
  font-size: 0.75rem;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
}

.notes-content :deep(pre code) {
  background: transparent;
  border: none;
  color: inherit;
  padding: 0;
}

.notes-content :deep(blockquote) {
  margin: 0.4rem 0;
  padding: 0.25rem 0.65rem;
  border-left: 3px solid var(--primary);
  background: rgba(59, 130, 246, 0.06);
  border-radius: 0 4px 4px 0;
  color: var(--text-muted);
}

.notes-content :deep(hr) {
  border: none;
  border-top: 1px solid var(--border-subtle);
  margin: 0.65rem 0;
}

.notes-content :deep(a) {
  color: var(--primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* 控制台日志区 */
.running-indicator {
  font-size: 0.75rem;
  color: var(--primary);
  font-weight: 600;
}

.logs-console-box {
  background: #0f172a;
  color: #f8fafc;
  border-radius: var(--radius-md);
  padding: 0.85rem 1rem;
  font-family: monospace;
  font-size: 0.775rem;
  max-height: 180px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.log-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.log-header-line {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.log-step-tag {
  color: #64748b;
  font-size: 0.6875rem;
}

.log-step-title {
  color: #f1f5f9;
}

.log-status-success .log-step-title {
  color: #4ade80;
}

.log-status-failed .log-step-title {
  color: #f87171;
}

.log-status-running .log-step-title {
  color: #60a5fa;
}

.log-output-detail {
  margin: 0.2rem 0 0;
  padding: 0.4rem;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 4px;
  color: #94a3b8;
  font-size: 0.6875rem;
  white-space: pre-wrap;
}

/* 升级成功横幅 */
.update-success-banner {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: var(--radius-md);
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.success-icon-box {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #10b981;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.success-text-box {
  flex: 1;
}

.success-text-box strong {
  display: block;
  font-size: 0.875rem;
  color: #059669;
  margin-bottom: 0.2rem;
}

.success-text-box p {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.reload-page-btn {
  padding: 0.45rem 0.95rem;
  border-radius: var(--radius-full);
  background: #10b981;
  color: #ffffff;
  font-size: 0.8125rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.15s;
}

.reload-page-btn:hover {
  opacity: 0.9;
}

/* 部署指引区 */
.deployment-guides-section {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 1rem;
}

.guide-tip-text {
  font-size: 0.6875rem;
  color: var(--text-subtle);
}

.guide-tabs-row {
  display: flex;
  gap: 0.4rem;
  margin: 0.6rem 0;
}

.guide-tab-btn {
  padding: 0.25rem 0.65rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 500;
  background: var(--bg-surface-subtle);
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
}

.guide-tab-btn.active {
  background: var(--primary);
  color: var(--primary-contrast);
  border-color: var(--primary);
}

.guide-content-box {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.command-block-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  background: var(--bg-surface-subtle);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 0.45rem 0.75rem;
}

.command-block-row code {
  font-family: monospace;
  font-size: 0.75rem;
  color: var(--text-main);
  overflow-x: auto;
  white-space: nowrap;
}

.copy-cmd-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.6875rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  cursor: pointer;
  flex-shrink: 0;
}

.copy-cmd-btn:hover {
  background: var(--bg-surface-hover);
  color: var(--text-main);
}

.guide-explanation {
  margin: 0;
  font-size: 0.6875rem;
  color: var(--text-subtle);
  line-height: 1.4;
}

/* 底部操作区 */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-surface-subtle);
}

.auto-check-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.75rem;
  color: var(--text-muted);
  cursor: pointer;
  user-select: none;
}

.auto-check-toggle input {
  cursor: pointer;
}

.footer-right-actions {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.btn-cancel {
  padding: 0.45rem 0.95rem;
  border-radius: var(--radius-full);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-main);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-cancel:hover {
  background: var(--bg-surface-hover);
  border-color: var(--border-strong);
}

.btn-upgrade-now {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 1.25rem;
  border-radius: var(--radius-full);
  background: var(--primary);
  color: var(--primary-contrast);
  font-size: 0.8125rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  transition: all 0.15s;
}

.btn-upgrade-now:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn-upgrade-now:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-upgrade-now.is-success-action {
  background: #10b981;
}
</style>
