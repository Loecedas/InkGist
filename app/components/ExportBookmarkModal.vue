<template>
  <div v-if="modelValue" class="modal-overlay" @click.self="closeModal">
    <div class="modal-card export-modal-card">
      <div class="modal-header">
        <div class="header-title-group">
          <svg class="svg-icon modal-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.download"></svg>
          <h3>导出书签与知识库 ({{ exportFormat === 'karakeep' ? '同步至 Karakeep' : exportFormat === 'markdown' ? 'Markdown 笔记' : 'Netscape HTML' }})</h3>
        </div>
        <button class="close-btn" title="关闭" @click="closeModal">
          <svg class="svg-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.close"></svg>
        </button>
      </div>

      <div class="modal-body">
        <!-- 导出格式与同步目标选择 -->
        <div class="export-format-section">
          <label class="form-label">导出与同步目标：</label>
          <div class="format-toggle-grid">
            <button
              type="button"
              class="format-pill-btn"
              :class="{ active: exportFormat === 'html' }"
              @click="exportFormat = 'html'"
            >
              <span>🌐 浏览器书签 (.html)</span>
            </button>
            <button
              type="button"
              class="format-pill-btn format-pill-md"
              :class="{ active: exportFormat === 'markdown' }"
              @click="exportFormat = 'markdown'"
            >
              <span>📝 Obsidian /<br class="br-md" />Markdown (.md)</span>
            </button>
            <button
              type="button"
              class="format-pill-btn format-pill-full"
              :class="{ active: exportFormat === 'karakeep' }"
              @click="exportFormat = 'karakeep'"
            >
              <span>🚀 同步至 Karakeep (API)</span>
            </button>
          </div>
        </div>

        <!-- 导出范围选择：全部 vs 自定义 -->
        <div class="export-scope-section">
          <label class="form-label">同步/导出范围：</label>
          <div class="scope-options-grid">
            <div
              class="scope-option-card"
              :class="{ active: exportScope === 'all' }"
              @click="exportScope = 'all'"
            >
              <div class="scope-arrow-box">
                <svg
                  class="svg-icon scope-arrow"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  v-html="ICONS.arrowRight"
                ></svg>
              </div>
              <div class="scope-text">
                <span class="scope-title">📁 全部书签</span>
                <span class="scope-desc">包含所有分类与书签 (共 {{ totalAllBookmarksCount }} 条)</span>
              </div>
            </div>

            <div
              class="scope-option-card"
              :class="{ active: exportScope === 'custom' }"
              @click="exportScope = 'custom'"
            >
              <div class="scope-arrow-box">
                <svg
                  class="svg-icon scope-arrow"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  v-html="ICONS.arrowRight"
                ></svg>
              </div>
              <div class="scope-text">
                <span class="scope-title">🎯 自定义勾选书签</span>
                <span class="scope-desc">在下方列表中自由勾选需要同步/导出的书签 (已勾选 {{ customSelectedBookmarkIds.size }}/{{ allBookmarks.length }} 条)</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 自定义勾选书签选择面板 -->
        <div v-if="exportScope === 'custom'" class="custom-selection-panel">
          <div class="custom-panel-header">
            <input
              v-model="customSearchFilter"
              type="text"
              class="custom-search-input"
              placeholder="搜索待导出的书签或网址..."
            />
            <button type="button" class="btn-picker-action" @click="toggleSelectAllCustom">
              {{ isAllCustomFilteredSelected ? '取消全选' : '全选列表' }}
            </button>
          </div>

          <div class="custom-bookmarks-checklist">
            <div
              v-for="bm in filteredCustomBookmarks"
              :key="bm.id"
              class="custom-bm-item"
              :class="{ 'is-checked': customSelectedBookmarkIds.has(bm.id) }"
              @click="toggleCustomBookmark(bm.id)"
            >
              <input
                type="checkbox"
                class="custom-bm-cb"
                :checked="customSelectedBookmarkIds.has(bm.id)"
                tabindex="-1"
                readonly
              />
              <span v-if="bm.folder" class="custom-folder-tag">📁 {{ bm.folder }}</span>
              <span class="custom-bm-title" :title="bm.title">{{ bm.title }}</span>
              <span class="custom-bm-url" :title="bm.url">{{ bm.url }}</span>
            </div>
            <div v-if="filteredCustomBookmarks.length === 0" class="custom-empty-hint">
              未找到匹配的书签
            </div>
          </div>
        </div>

        <!-- 导出文件名 (仅在导出文件时显示) -->
        <div v-if="exportFormat !== 'karakeep'" class="export-filename-section">
          <label class="form-label">导出文件名：</label>
          <div class="input-with-ext">
            <input v-model="customFilename" type="text" class="input-flat" placeholder="InkGist_Bookmarks" />
            <span class="file-ext">{{ exportFormat === 'markdown' ? '.md' : '.html' }}</span>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <div class="footer-stats-text">
          <span v-if="isSyncingKarakeep" class="syncing-indicator">
            ⏳ 正在同步至 Karakeep，请稍候...
          </span>
          <span v-else>预计将{{ exportFormat === 'karakeep' ? '同步' : '导出' }} <strong>{{ targetBookmarksCount }}</strong> 条书签</span>
        </div>
        <div class="footer-btn-group">
          <button class="btn-secondary btn-sm" :disabled="isSyncingKarakeep" @click="closeModal">取消</button>
          <button
            class="btn-primary btn-sm"
            :disabled="targetBookmarksCount === 0 || isSyncingKarakeep"
            @click="handleExport"
          >
            <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="exportFormat === 'karakeep' ? ICONS.sync : ICONS.download"></svg>
            <span>
              {{ isSyncingKarakeep ? '正在推送同步...' : exportFormat === 'karakeep' ? `立即同步至 Karakeep (${targetBookmarksCount})` : exportFormat === 'markdown' ? '立即导出 Markdown' : '立即导出 HTML' }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { ICONS, type Bookmark } from '../pages/state'
import { downloadBookmarksAsHtml } from '../utils/bookmark-io'

const props = defineProps<{
  modelValue: boolean
  allBookmarks: Bookmark[]
  activeFolder?: string
  selectedBookmarkIds?: Set<string>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'exported', count: number): void
}>()

const exportFormat = ref<'html' | 'markdown' | 'karakeep'>('html')
const exportScope = ref<'all' | 'custom'>('all')
const customFilename = ref('InkGist_Bookmarks')
const customSearchFilter = ref('')
const customSelectedBookmarkIds = ref<Set<string>>(new Set())

// Karakeep 直连同步配置状态
const karakeepUrl = ref('http://localhost:3000')
const karakeepApiKey = ref('')
const isTestingKarakeep = ref(false)
const isKarakeepConnected = ref(false)
const karakeepTestMsg = ref('')
const isSyncingKarakeep = ref(false)

// 读取本地持久化记忆的 Karakeep 配置
if (typeof window !== 'undefined') {
  try {
    const savedUrl = localStorage.getItem('inkgist_karakeep_url')
    if (savedUrl) karakeepUrl.value = savedUrl
    const savedKey = localStorage.getItem('inkgist_karakeep_key')
    if (savedKey) karakeepApiKey.value = savedKey
  } catch {}
}

const handleTestKarakeepConnection = async () => {
  if (!karakeepUrl.value.trim() || !karakeepApiKey.value.trim()) return
  isTestingKarakeep.value = true
  karakeepTestMsg.value = ''
  isKarakeepConnected.value = false

  try {
    const res = await $fetch<any>('/api/sync/karakeep', {
      method: 'POST',
      body: {
        action: 'test',
        instanceUrl: karakeepUrl.value.trim(),
        apiKey: karakeepApiKey.value.trim()
      }
    })

    if (res && res.success) {
      isKarakeepConnected.value = true
      karakeepTestMsg.value = '✅ 连接成功！已检测到在线 Karakeep 实例'
      if (typeof window !== 'undefined') {
        localStorage.setItem('inkgist_karakeep_url', karakeepUrl.value.trim())
        localStorage.setItem('inkgist_karakeep_key', karakeepApiKey.value.trim())
      }
    } else {
      isKarakeepConnected.value = false
      karakeepTestMsg.value = `❌ ${res?.error || '连接失败'}`
    }
  } catch (err: any) {
    isKarakeepConnected.value = false
    karakeepTestMsg.value = `❌ 无法访问 Karakeep: ${err?.data?.statusMessage || err.message || '网络连接失败'}`
  } finally {
    isTestingKarakeep.value = false
  }
}

// 弹窗开启时锁定背景滚动，防止滚动穿透
watch(() => props.modelValue, (val) => {
  if (typeof document !== 'undefined') {
    if (val) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  }

  if (val) {
    customSearchFilter.value = ''
    karakeepTestMsg.value = ''
    // 如果在批量管理模式下（已勾选书签），打开弹窗默认选中自定义选项并回填勾选项
    if (props.selectedBookmarkIds && props.selectedBookmarkIds.size > 0) {
      exportScope.value = 'custom'
      customSelectedBookmarkIds.value = new Set(props.selectedBookmarkIds)
    } else {
      exportScope.value = 'all'
      customSelectedBookmarkIds.value = new Set(props.allBookmarks.map(b => b.id))
    }

    const formatLocalDate = (dInput?: Date | string) => {
      const d = dInput ? (typeof dInput === 'string' ? new Date(dInput) : dInput) : new Date()
      if (isNaN(d.getTime())) return typeof dInput === 'string' ? dInput : ''
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    const dateStr = formatLocalDate().replace(/-/g, '')
    customFilename.value = `InkGist_Bookmarks_${dateStr}`
  }
}, { immediate: true })

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
})

const totalAllBookmarksCount = computed(() => props.allBookmarks.length)

const filteredCustomBookmarks = computed(() => {
  if (!customSearchFilter.value.trim()) return props.allBookmarks
  const q = customSearchFilter.value.trim().toLowerCase()
  return props.allBookmarks.filter(b =>
    (b.title && b.title.toLowerCase().includes(q)) ||
    (b.url && b.url.toLowerCase().includes(q)) ||
    (b.folder && b.folder.toLowerCase().includes(q))
  )
})

const isAllCustomFilteredSelected = computed(() => {
  if (filteredCustomBookmarks.value.length === 0) return false
  return filteredCustomBookmarks.value.every(b => customSelectedBookmarkIds.value.has(b.id))
})

const toggleCustomBookmark = (id: string) => {
  if (customSelectedBookmarkIds.value.has(id)) {
    customSelectedBookmarkIds.value.delete(id)
  } else {
    customSelectedBookmarkIds.value.add(id)
  }
}

const toggleSelectAllCustom = () => {
  const currentList = filteredCustomBookmarks.value
  if (isAllCustomFilteredSelected.value) {
    currentList.forEach(b => customSelectedBookmarkIds.value.delete(b.id))
  } else {
    currentList.forEach(b => customSelectedBookmarkIds.value.add(b.id))
  }
}

const targetBookmarks = computed(() => {
  if (exportScope.value === 'custom') {
    return props.allBookmarks.filter(b => customSelectedBookmarkIds.value.has(b.id))
  }
  return props.allBookmarks
})

const targetBookmarksCount = computed(() => targetBookmarks.value.length)

const closeModal = () => {
  if (isSyncingKarakeep.value) return
  emit('update:modelValue', false)
}

const downloadMarkdownFile = (content: string, filename: string) => {
  if (typeof window === 'undefined') return
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const generateMarkdownArchive = (bms: Bookmark[]): string => {
  const formatLocalDate = (dInput?: Date | string) => {
    const d = dInput ? (typeof dInput === 'string' ? new Date(dInput) : dInput) : new Date()
    if (isNaN(d.getTime())) return typeof dInput === 'string' ? dInput : ''
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  const dateStr = formatLocalDate()
  let md = `---
title: "墨萃书签知识库归档"
created: "${dateStr}"
total_bookmarks: ${bms.length}
generator: "墨萃 · InkGist"
---

# 📚 墨萃书签知识库归档

> 📅 归档日期：${dateStr} | 🔖 书签总量：${bms.length} 条
> 💡 本文件兼容 Obsidian、Notion、Logseq、语雀等主流知识管理工具，完整包含 AI 深度总结与待办行动指南。

---

`

  // 按分类分组输出
  const folderMap = new Map<string, Bookmark[]>()
  for (const bm of bms) {
    const fName = bm.folder || '未分类'
    if (!folderMap.has(fName)) folderMap.set(fName, [])
    folderMap.get(fName)!.push(bm)
  }

  for (const [folderName, items] of folderMap.entries()) {
    md += `\n## 📁 ${folderName} (${items.length})\n\n`
    for (const bm of items) {
      const bmDate = bm.createdAt ? formatLocalDate(bm.createdAt) : dateStr
      md += `### 🔗 [${bm.title || bm.url}](${bm.url})\n\n`
      md += `- **网址**：[${bm.url}](${bm.url})\n`
      md += `- **所属分类**：\`${folderName}\`\n`
      if (bm.isFavorite) md += `- **状态**：⭐ 已收藏\n`
      if (bm.description) md += `- **描述**：${bm.description}\n`
      md += `- **收录时间**：${bmDate}\n\n`

      if (bm.summary && bm.summary.trim()) {
        md += `#### 🤖 AI 智能总结与行动指南\n\n`
        md += `${bm.summary.trim()}\n\n`
      }

      md += `---\n\n`
    }
  }

  return md
}

const handleExport = async () => {
  const list = targetBookmarks.value
  if (list.length === 0) return

  // Karakeep API 直连同步 (直接调用服务端 .env 配置)
  if (exportFormat.value === 'karakeep') {
    isSyncingKarakeep.value = true

    try {
      const res = await $fetch<any>('/api/sync/karakeep', {
        method: 'POST',
        body: {
          action: 'sync',
          bookmarks: list
        }
      })

      if (res && res.success && res.syncedCount > 0) {
        emit('exported', res.syncedCount)
        alert(`🎉 成功同步 ${res.syncedCount} / ${res.total} 条书签至 Karakeep！\n\n📌 标题已严格对齐，描述与概括字段均已精准映射填充。`)
        closeModal()
      } else {
        const errorDetail = res?.error || (res?.errors && res.errors[0]?.error) || '未能成功将书签写入 Karakeep 实例'
        alert(`❌ 同步未完成: ${errorDetail}\n\n💡 提示：请确认已在项目根目录的 .env 文件中填入有效的 KARAKEEP_API_KEY！`)
      }
    } catch (e: any) {
      alert(`❌ 同步请求失败: ${e?.data?.statusMessage || e.message || '请检查 .env 中的 KARAKEEP_API_KEY 配置'}`)
    } finally {
      isSyncingKarakeep.value = false
    }
    return
  }

  let fname = customFilename.value.trim() || 'InkGist_Bookmarks'

  if (exportFormat.value === 'markdown') {
    if (!fname.endsWith('.md')) fname += '.md'
    const mdContent = generateMarkdownArchive(list)
    downloadMarkdownFile(mdContent, fname)
  } else {
    if (!fname.endsWith('.html') && !fname.endsWith('.htm')) fname += '.html'
    downloadBookmarksAsHtml(list, fname)
  }

  emit('exported', list.length)
  closeModal()
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1.25rem;
  overscroll-behavior: contain;
}

.export-modal-card {
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  box-shadow: var(--shadow-xl, 0 20px 40px -15px rgba(0, 0, 0, 0.4));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modalScaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  overscroll-behavior: contain;
  color: var(--text-main);
}

@keyframes modalScaleIn {
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.modal-header {
  padding: 1.25rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
  background: var(--bg-surface);
}

.header-title-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-title-group h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-main);
  margin: 0;
}

.modal-icon {
  color: var(--text-main);
  display: inline-flex;
}

.close-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--bg-surface-hover);
  color: var(--text-main);
}

.modal-body {
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
  overflow-y: auto;
  flex: 1;
  overscroll-behavior: contain;
  background: var(--bg-surface);
}

.form-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 0.5rem;
  display: block;
}

.format-toggle-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  width: 100%;
}

.format-pill-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.65rem 0.75rem;
  min-height: 46px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface-subtle);
  color: var(--text-muted);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  text-align: center;
  box-sizing: border-box;
  width: 100%;
}

.format-pill-btn span {
  white-space: normal;
  text-align: center;
  line-height: 1.35;
  word-break: break-word;
}

.format-pill-btn:hover {
  border-color: var(--border-focus, var(--text-main));
  color: var(--text-main);
  background: var(--bg-surface-hover);
}

.format-pill-btn.active {
  background: var(--primary);
  color: var(--primary-contrast) !important;
  border-color: var(--primary);
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.format-pill-full {
  grid-column: 1 / -1;
  width: 100%;
}

/* Karakeep 直连配置卡片 */
.karakeep-config-card {
  background: var(--bg-surface-subtle);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 0.85rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.karakeep-config-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.karakeep-badge-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-main);
}

.btn-test-conn {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  padding: 0.25rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.15s;
}
.btn-test-conn:hover:not(:disabled) {
  background: var(--bg-surface-hover);
}

.karakeep-fields-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.field-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
}

.karakeep-input {
  width: 100%;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  padding: 0.45rem 0.65rem;
  font-size: 0.8125rem;
  outline: none;
  background: var(--bg-surface);
  color: var(--text-main);
  box-sizing: border-box;
}
.karakeep-input:focus {
  border-color: var(--primary);
}

.karakeep-status-pill {
  font-size: 0.75rem;
  padding: 0.35rem 0.65rem;
  border-radius: 6px;
  font-weight: 500;
}
.karakeep-status-pill.is-ok {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.35);
}
.karakeep-status-pill.is-err {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.35);
}

.karakeep-mapping-hint {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  padding: 0.5rem 0.65rem;
  border-radius: 6px;
}

.mapping-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-main);
}

.mapping-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.map-tag {
  font-size: 0.6875rem;
  background: var(--bg-surface-subtle);
  border: 1px solid var(--border-subtle);
  border-radius: 4px;
  padding: 0.1rem 0.35rem;
  color: var(--text-muted);
}

.syncing-indicator {
  color: var(--primary);
  font-weight: 600;
}

.scope-options-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.scope-option-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--bg-surface-subtle);
}

.scope-option-card:hover {
  border-color: var(--border-focus, var(--text-muted));
  background: var(--bg-surface-hover);
}

.scope-option-card.active {
  border-color: var(--primary);
  background: var(--bg-surface-hover);
}

.scope-arrow-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.scope-arrow {
  color: var(--text-muted);
  opacity: 0.45;
  transform: translateX(-2px);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.scope-option-card.active .scope-arrow {
  color: var(--primary);
  opacity: 1;
  transform: translateX(2px);
}

.scope-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.scope-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-main);
}

.scope-desc {
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* 自定义勾选列表面板 (支持独立平滑滚动) */
.custom-selection-panel {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  padding: 0.75rem;
  background: var(--bg-surface-subtle);
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.custom-panel-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.custom-search-input {
  flex: 1;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  padding: 0.4rem 0.65rem;
  font-size: 0.8125rem;
  outline: none;
  background: var(--bg-surface);
  color: var(--text-main);
}
.custom-search-input:focus {
  border-color: var(--primary);
}

.btn-picker-action {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  padding: 0.4rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-main);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}
.btn-picker-action:hover {
  background: var(--bg-surface-hover);
}

.custom-bookmarks-checklist {
  max-height: 200px;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  padding: 0.4rem;
}

.custom-bm-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.55rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.78125rem;
  transition: background 0.1s;
  color: var(--text-main);
}
.custom-bm-item:hover {
  background: var(--bg-surface-hover);
}
.custom-bm-item.is-checked {
  background: var(--bg-surface-subtle);
}

.custom-bm-cb {
  cursor: pointer;
  flex-shrink: 0;
  accent-color: var(--primary);
  pointer-events: none;
}

.custom-folder-tag {
  font-size: 0.6875rem;
  background: var(--bg-surface-subtle);
  border: 1px solid var(--border-subtle);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  color: var(--text-muted);
  white-space: nowrap;
  flex-shrink: 0;
}

.custom-bm-title {
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
  flex-shrink: 0;
}

.custom-bm-url {
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.custom-empty-hint {
  padding: 1.5rem;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.75rem;
}

.input-with-ext {
  display: flex;
  align-items: center;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-surface);
}

.input-flat {
  flex: 1;
  border: none;
  outline: none;
  padding: 0.55rem 0.85rem;
  font-size: 0.875rem;
  background: transparent;
  color: var(--text-main);
}

.file-ext {
  padding-right: 0.85rem;
  font-size: 0.85rem;
  color: var(--text-muted);
  font-family: monospace;
}

.eco-compatibility-box {
  background: var(--bg-surface-subtle);
  border: 1px dashed var(--border-subtle);
  border-radius: 10px;
  padding: 0.75rem 1rem;
}

.eco-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 0.3rem;
}

.eco-desc {
  font-size: 0.75rem;
  line-height: 1.45;
  color: var(--text-muted);
  margin-bottom: 0.45rem;
}

.eco-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.eco-pill {
  font-size: 0.7rem;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 4px;
  padding: 0.15rem 0.45rem;
  color: var(--text-muted);
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-surface-subtle);
  flex-shrink: 0;
}

.footer-stats-text {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.footer-stats-text strong {
  color: var(--text-main);
}

.footer-btn-group {
  display: flex;
  gap: 0.6rem;
}

.btn-primary, .btn-secondary {
  padding: 0.5rem 0.95rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary);
  color: var(--primary-contrast) !important;
  border: 1px solid var(--primary);
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--bg-surface);
  color: var(--text-main);
  border: 1px solid var(--border-subtle);
}

.btn-secondary:hover {
  background: var(--bg-surface-hover);
}

/* 425 / 375 及移动端小屏专属响应式适配 */
@media (max-width: 640px) {
  .format-toggle-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 0.45rem !important;
  }

  .format-pill-btn {
    width: 100% !important;
    white-space: normal !important;
    text-align: center !important;
    padding: 0.55rem 0.4rem !important;
    font-size: 0.75rem !important;
    min-height: 42px !important;
  }

  .format-pill-full {
    grid-column: 1 / -1 !important;
    width: 100% !important;
  }

  .modal-footer {
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 0.75rem !important;
    padding: 0.85rem 1rem !important;
  }

  .footer-stats-text {
    text-align: center !important;
    font-size: 0.8125rem !important;
  }

  .footer-btn-group {
    display: flex !important;
    flex-direction: column-reverse !important;
    width: 100% !important;
    gap: 0.5rem !important;
  }

  .footer-btn-group .btn-primary,
  .footer-btn-group .btn-secondary {
    width: 100% !important;
    justify-content: center !important;
    padding: 0.65rem 1rem !important;
    font-size: 0.875rem !important;
  }
}
</style>
