import { ref } from 'vue'

export interface VersionInfo {
  currentVersion: string
  latestVersion: string
  hasUpdate: boolean
  releaseNotes: string
  releaseNotesEn?: string
  releaseUrl: string
  publishedAt?: string
  currentCommit?: string
  latestCommit?: string
  isGitRepo: boolean
  branch?: string
  lastCheckedAt: string
}

export interface UpdateLogItem {
  step: string
  status: 'running' | 'success' | 'failed' | 'skipped'
  message: string
  output?: string
  timestamp: string
}

// 全局单例响应式状态
const versionInfo = ref<VersionInfo>({
  currentVersion: '1.0.0',
  latestVersion: '1.0.0',
  hasUpdate: false,
  releaseNotes: '',
  releaseUrl: 'https://github.com/Loecedas/InkGist/releases',
  isGitRepo: false,
  lastCheckedAt: ''
})

const isChecking = ref(false)
const isUpdating = ref(false)
const updateLogs = ref<UpdateLogItem[]>([])
const updateResult = ref<{ success: boolean; message: string } | null>(null)
const autoCheckEnabled = ref(true)
const isModalOpen = ref(false)

const STORAGE_KEY_AUTO_CHECK = 'inkgist_auto_check_update'
const STORAGE_KEY_LAST_CHECK_TIME = 'inkgist_last_check_update_time'

export function useUpdater() {
  // 初始化加载偏好设置
  if (typeof window !== 'undefined') {
    const savedAutoCheck = localStorage.getItem(STORAGE_KEY_AUTO_CHECK)
    if (savedAutoCheck !== null) {
      autoCheckEnabled.value = savedAutoCheck === 'true'
    }
  }

  const setAutoCheck = (enabled: boolean) => {
    autoCheckEnabled.value = enabled
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_AUTO_CHECK, String(enabled))
    }
  }

  const openUpdateModal = () => {
    isModalOpen.value = true
    if (!versionInfo.value.lastCheckedAt) {
      checkUpdate(true)
    }
  }

  const closeUpdateModal = () => {
    isModalOpen.value = false
  }

  // 检查新版本
  const checkUpdate = async (force = false) => {
    if (isChecking.value) return
    isChecking.value = true

    try {
      const data = await $fetch<VersionInfo>(`/api/system/version${force ? '?force=true' : ''}`)
      if (data) {
        versionInfo.value = data
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_LAST_CHECK_TIME, String(Date.now()))
        }
      }
    } catch (err) {
      console.warn('[Updater] Check update failed:', err)
    } finally {
      isChecking.value = false
    }
  }

  // 静默自检（每次载入或距离上次超过 12 小时自检一次）
  const checkUpdateSilently = async () => {
    if (typeof window === 'undefined' || !autoCheckEnabled.value) return
    const lastTime = Number(localStorage.getItem(STORAGE_KEY_LAST_CHECK_TIME) || '0')
    const now = Date.now()
    if (now - lastTime > 6 * 60 * 60 * 1000) {
      await checkUpdate(false)
    }
  }

  // 执行一键在线更新
  const executeUpdate = async () => {
    if (isUpdating.value) return
    isUpdating.value = true
    updateLogs.value = []
    updateResult.value = null

    try {
      const res = await $fetch<{ success: boolean; message: string; logs: UpdateStepLogItem[] }>('/api/system/update', {
        method: 'POST'
      })

      if (res && res.logs) {
        updateLogs.value = res.logs
      }
      updateResult.value = {
        success: res.success,
        message: res.message
      }

      if (res.success) {
        // 更新成功后刷新本地版本信息
        await checkUpdate(true)
      }
    } catch (err: any) {
      updateResult.value = {
        success: false,
        message: err?.data?.statusMessage || err?.message || '更新请求失败'
      }
    } finally {
      isUpdating.value = false
    }
  }

  return {
    versionInfo,
    isChecking,
    isUpdating,
    updateLogs,
    updateResult,
    autoCheckEnabled,
    isModalOpen,
    setAutoCheck,
    openUpdateModal,
    closeUpdateModal,
    checkUpdate,
    checkUpdateSilently,
    executeUpdate
  }
}
