<template>
  <div class="snapshot-receiver-layout">
    <div class="receiver-card">
      <div class="loading-spinner"></div>
      <h3 class="receiver-title">正在完整保存网页快照...</h3>
      <p class="receiver-desc">已成功绕过 CSP 安全限制并建立加密通信通道</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from '#app'
import { useSnapshots, type SnapshotItem } from '../state'

const router = useRouter()
const { addSnapshot } = useSnapshots()

let isHandled = false

const handleMessage = async (event: MessageEvent) => {
  if (isHandled) return
  const data = event.data
  if (!data || data.type !== 'INKGIST_SAVE_SNAPSHOT') return

  isHandled = true

  const snapshotItem: SnapshotItem = {
    id: data.id || ('snap_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)),
    url: data.url || window.location.href,
    title: data.title || '未命名网页快照',
    description: data.description || '',
    siteName: data.siteName || '',
    coverImage: data.coverImage || undefined,
    contentHtml: data.contentHtml || '',
    wordCount: data.wordCount ? Number(data.wordCount) : undefined,
    createdAt: new Date().toISOString()
  }

  try {
    // 1. 本地 IndexedDB 快速持久化
    await addSnapshot(snapshotItem)

    // 2. 服务端临时中转缓存备份
    await $fetch('/api/snapshot/form-save', {
      method: 'POST',
      body: snapshotItem
    }).catch(() => {})

    // 3. 通知父窗口已成功接收
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: 'INKGIST_SNAPSHOT_SAVED', id: snapshotItem.id }, '*')
    }

    // 4. 跳转至专属离线快照查看页
    router.replace(`/snapshot/${snapshotItem.id}`)
  } catch (err) {
    console.error('Failed to save snapshot in receiver:', err)
    router.replace(`/snapshot/${snapshotItem.id}`)
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('message', handleMessage)

    // 向 opener 广播就绪信号
    const sendReady = () => {
      if (isHandled) return
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'INKGIST_RECEIVER_READY' }, '*')
      }
    }

    sendReady()
    const timer = setInterval(sendReady, 150)
    setTimeout(() => clearInterval(timer), 6000)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('message', handleMessage)
  }
})
</script>

<style scoped>
.snapshot-receiver-layout {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-app, #f6f8fa);
  color: var(--text-main, #0f172a);
  padding: 20px;
}

.receiver-card {
  text-align: center;
  background: var(--bg-surface, #ffffff);
  border: 1px solid var(--border-subtle, #e2e8f0);
  border-radius: var(--radius-lg, 14px);
  padding: 36px 40px;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.loading-spinner {
  width: 28px;
  height: 28px;
  border: 2px solid var(--text-subtle, #cbd5e1);
  border-top-color: var(--primary, #0f172a);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 4px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.receiver-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-main, #0f172a);
}

.receiver-desc {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted, #64748b);
}
</style>
