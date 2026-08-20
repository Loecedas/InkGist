import { ref, computed, onMounted, watch } from 'vue'
import { useCookie, useRequestFetch } from '#app'

// =============================================================================
// 1. 用户鉴权与免登持久化 (useAuth)
// =============================================================================
export interface User {
  id: string
  username: string
  createdAt?: string
}

const STORAGE_KEY_USER = 'auth_cached_user_v1'
const STORAGE_KEY_TOKEN = 'auth_cached_token_v1'

const currentUser = ref<User | null>(null)
const isAuthChecked = ref(false)
const isSubmitting = ref(false)
const authError = ref('')

export const getAuthHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem(STORAGE_KEY_TOKEN)
  if (token) {
    return {
      Authorization: `Bearer ${token}`,
      'x-auth-token': token
    }
  }
  return {}
}

const loadFromLocalStorage = () => {
  if (typeof window === 'undefined') return
  try {
    const cachedUser = localStorage.getItem(STORAGE_KEY_USER)
    if (cachedUser) {
      currentUser.value = JSON.parse(cachedUser)
    }
  } catch (e) {
    console.warn('Failed to parse cached user:', e)
  }
}

if (typeof window !== 'undefined') {
  loadFromLocalStorage()
}

export const useAuth = () => {
  const sessionCookie = useCookie('auth_session_token', {
    maxAge: 365 * 24 * 60 * 60,
    path: '/'
  })
  const clientCookie = useCookie('auth_client_token', {
    maxAge: 365 * 24 * 60 * 60,
    path: '/'
  })

  const isLoggedIn = computed(() => {
    if (typeof window !== 'undefined') {
      const hasLocalUser = !!localStorage.getItem(STORAGE_KEY_USER)
      const hasLocalToken = !!localStorage.getItem(STORAGE_KEY_TOKEN)
      return hasLocalUser || hasLocalToken || !!currentUser.value || !!sessionCookie.value || !!clientCookie.value
    }
    return !!currentUser.value || !!sessionCookie.value || !!clientCookie.value
  })

  const fetchCurrentUser = async () => {
    if (typeof window !== 'undefined') {
      loadFromLocalStorage()
    }

    try {
      const headers = getAuthHeaders()
      const fetcher = import.meta.server ? useRequestFetch() : $fetch
      const data = await fetcher<{ user: User | null; success?: boolean; token?: string }>('/api/auth/user', {
        headers
      })
      if (data && data.user) {
        currentUser.value = data.user
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user))
          if (data.token) {
            localStorage.setItem(STORAGE_KEY_TOKEN, data.token)
          }
        }
        return data.user
      } else {
        // 服务端明确返回无用户时清空
        if (data && data.user === null) {
          currentUser.value = null
          if (typeof window !== 'undefined') {
            localStorage.removeItem(STORAGE_KEY_USER)
            localStorage.removeItem(STORAGE_KEY_TOKEN)
          }
        }
        return null
      }
    } catch (err: any) {
      if (err?.statusCode === 401 || err?.response?.status === 401 || err?.status === 401) {
        currentUser.value = null
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY_USER)
          localStorage.removeItem(STORAGE_KEY_TOKEN)
        }
      }
      return currentUser.value
    } finally {
      isAuthChecked.value = true
    }
  }

  const login = async (username: string, password: string): Promise<boolean> => {
    isSubmitting.value = true
    authError.value = ''
    try {
      const res = await $fetch<{ success: boolean; user: User; token?: string }>('/api/auth/login', {
        method: 'POST',
        body: { username, password }
      })
      if (res && res.user) {
        currentUser.value = res.user
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(res.user))
          if (res.token) {
            localStorage.setItem(STORAGE_KEY_TOKEN, res.token)
          }
        }
        return true
      }
      return false
    } catch (err: any) {
      authError.value = err?.data?.statusMessage || err?.message || '登录失败，请检查账号密码'
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  const register = async (username: string, password: string): Promise<boolean> => {
    isSubmitting.value = true
    authError.value = ''
    try {
      const res = await $fetch<{ success: boolean; user: User; token?: string }>('/api/auth/register', {
        method: 'POST',
        body: { username, password }
      })
      if (res && res.user) {
        currentUser.value = res.user
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(res.user))
          if (res.token) {
            localStorage.setItem(STORAGE_KEY_TOKEN, res.token)
          }
        }
        return true
      }
      return false
    } catch (err: any) {
      authError.value = err?.data?.statusMessage || err?.message || '注册失败，请更换用户名重试'
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  const logout = async () => {
    try {
      const headers = getAuthHeaders()
      await $fetch('/api/auth/logout', { method: 'POST', headers })
    } catch {
      // ignore
    } finally {
      currentUser.value = null
      sessionCookie.value = null
      clientCookie.value = null
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY_USER)
        localStorage.removeItem(STORAGE_KEY_TOKEN)
      }
    }
  }

  return {
    currentUser,
    isLoggedIn,
    isAuthChecked,
    isSubmitting,
    authError,
    fetchCurrentUser,
    login,
    register,
    logout
  }
}

// =============================================================================
// 2. 主题切换状态 (useTheme - 单例驱动 + 系统主题动态感知)
// =============================================================================
export type ThemeMode = 'light' | 'dark' | 'auto'
const currentTheme = ref<ThemeMode>('auto')
let isThemeInitialized = false

const applyThemeToDom = (theme: ThemeMode) => {
  if (typeof window === 'undefined') return
  const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  if (isDark) {
    document.documentElement.classList.add('dark')
    document.documentElement.setAttribute('data-theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    document.documentElement.setAttribute('data-theme', 'light')
  }
}

const initThemeOnce = () => {
  if (typeof window === 'undefined' || isThemeInitialized) return
  isThemeInitialized = true

  const saved = localStorage.getItem('theme_mode_v2') as ThemeMode
  if (saved && ['light', 'dark', 'auto'].includes(saved)) {
    currentTheme.value = saved
  }
  applyThemeToDom(currentTheme.value)

  // 监听操作系统系统深浅色切换 (当 theme 为 auto 时自动无缝响应)
  try {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', () => {
      if (currentTheme.value === 'auto') {
        applyThemeToDom('auto')
      }
    })
  } catch (e) {}
}

export const useTheme = () => {
  initThemeOnce()

  const setTheme = (theme: ThemeMode) => {
    currentTheme.value = theme
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme_mode_v2', theme)
    }
    applyThemeToDom(theme)
  }

  const toggleNextTheme = () => {
    const cycle: ThemeMode[] = ['auto', 'light', 'dark']
    const next = cycle[(cycle.indexOf(currentTheme.value) + 1) % cycle.length]
    setTheme(next)
  }

  return {
    currentTheme,
    themeMode: currentTheme,
    setTheme,
    toggleNextTheme,
    cycleTheme: toggleNextTheme
  }
}

// =============================================================================
// 3. 书签与分类管理 (useBookmarks)
// =============================================================================
export interface Bookmark {
  id: string
  title: string
  url: string
  icon?: string
  description?: string
  summary?: string
  keyPoints?: string[]
  tags?: string[]
  folder?: string
  color?: string
  isPinned?: boolean
  isFavorite?: boolean
  createdAt?: string
}

export interface BookmarkFolder {
  id: string
  name: string
}

export type GridColumns = 1 | 2 | 3 | 4
export type SortOption = 'time-desc' | 'time-asc' | 'name-asc'

const STORAGE_KEY_BOOKMARKS = 'flat_bookmarks_v3'
const STORAGE_KEY_COLUMNS = 'flat_columns_v3'
const STORAGE_KEY_FOLDERS = 'flat_folders_v1'

export const normalizeUrl = (url: string) => {
  if (!url) return ''
  try {
    const u = new URL(url.startsWith('http') ? url.trim() : 'https://' + url.trim())
    const host = u.hostname.toLowerCase()
    let pathname = u.pathname
    if (pathname === '/') pathname = ''
    else pathname = pathname.replace(/\/+$/, '')
    return (host + pathname + (u.search ? u.search.toLowerCase() : '')).toLowerCase()
  } catch {
    return url.trim().replace(/\/+$/, '').toLowerCase()
  }
}

const deduplicateBookmarks = (list: Bookmark[]): Bookmark[] => {
  const seen = new Set<string>()
  const unique: Bookmark[] = []
  for (const b of list) {
    const norm = normalizeUrl(b.url)
    if (!seen.has(norm)) {
      seen.add(norm)
      unique.push(b)
    }
  }
  return unique
}

const bookmarks = ref<Bookmark[]>([])
const folders = ref<BookmarkFolder[]>([])
const activeFolder = ref<string>('all')
const columns = ref<GridColumns>(1)
const searchQuery = ref('')
const currentSort = ref<SortOption>('time-desc')
const isLoaded = ref(false)

export const useBookmarks = () => {
  const { isLoggedIn, currentUser, fetchCurrentUser } = useAuth()

  const getUserStorageKey = (baseKey: string) => {
    const uid = currentUser.value?.id || 'guest'
    return `${baseKey}_${uid}`
  }

  const saveToStorage = () => {
    if (typeof window === 'undefined') return
    try {
      bookmarks.value = deduplicateBookmarks(bookmarks.value)
      const key = getUserStorageKey(STORAGE_KEY_BOOKMARKS)
      localStorage.setItem(key, JSON.stringify(bookmarks.value))
    } catch (e) {
      console.error('Failed to save bookmarks locally', e)
    }
  }

  const saveFoldersToStorage = () => {
    if (typeof window === 'undefined') return
    try {
      const key = getUserStorageKey(STORAGE_KEY_FOLDERS)
      localStorage.setItem(key, JSON.stringify(folders.value))
    } catch (e) {
      console.error('Failed to save folders locally', e)
    }
  }

  const loadFromBackend = async () => {
    try {
      const headers = getAuthHeaders()
      const [bmRes, fdRes] = await Promise.all([
        $fetch<{ bookmarks: Bookmark[] }>('/api/user/bookmarks', { headers }),
        $fetch<{ folders: BookmarkFolder[] }>('/api/user/folders', { headers })
      ])
      if (bmRes && bmRes.bookmarks) {
        bookmarks.value = deduplicateBookmarks(bmRes.bookmarks)
        saveToStorage()
      }
      if (fdRes && fdRes.folders) {
        folders.value = fdRes.folders
        saveFoldersToStorage()
      }
    } catch {
      loadFromStorage()
    } finally {
      isLoaded.value = true
    }
  }

  const loadFromStorage = () => {
    if (typeof window === 'undefined') return
    try {
      const key = getUserStorageKey(STORAGE_KEY_BOOKMARKS)
      const savedBm = localStorage.getItem(key) || (!currentUser.value ? localStorage.getItem(STORAGE_KEY_BOOKMARKS) : null)
      if (savedBm) bookmarks.value = deduplicateBookmarks(JSON.parse(savedBm))
      else bookmarks.value = []

      const fKey = getUserStorageKey(STORAGE_KEY_FOLDERS)
      const savedFolders = localStorage.getItem(fKey) || (!currentUser.value ? localStorage.getItem(STORAGE_KEY_FOLDERS) : null)
      if (savedFolders) folders.value = JSON.parse(savedFolders)
      else folders.value = []

      const savedCol = localStorage.getItem(STORAGE_KEY_COLUMNS)
      if (savedCol) columns.value = Number(savedCol) as GridColumns
    } catch (e) {
      console.error('Failed to load bookmarks or folders', e)
    } finally {
      isLoaded.value = true
    }
  }

  const initData = async () => {
    await fetchCurrentUser()
    if (isLoggedIn.value) {
      await loadFromBackend()
    } else {
      loadFromStorage()
    }
  }

  if (typeof window !== 'undefined') {
    watch(currentUser, (newUser, oldUser) => {
      if (newUser?.id !== oldUser?.id) {
        bookmarks.value = []
        folders.value = []
        if (newUser) loadFromBackend()
        else loadFromStorage()
      }
    })

    // 跨标签页多窗口实时数据同步 (Multi-tab Storage Synchronization)
    window.addEventListener('storage', (e) => {
      const currentBmKey = getUserStorageKey(STORAGE_KEY_BOOKMARKS)
      const currentFdKey = getUserStorageKey(STORAGE_KEY_FOLDERS)
      if (e.key === currentBmKey || e.key === currentFdKey || e.key === STORAGE_KEY_COLUMNS) {
        if (!isLoggedIn.value) {
          loadFromStorage()
        } else {
          loadFromBackend()
        }
      }
      if (e.key === 'auth_cached_user_v1') {
        fetchCurrentUser()
      }
    })
  }

  const addFolder = async (name: string) => {
    const trimmed = name.trim()
    if (!trimmed || folders.value.some(f => f.name === trimmed)) return
    const newF: BookmarkFolder = { id: 'f_' + Date.now(), name: trimmed }
    folders.value.push(newF)
    saveFoldersToStorage()
    if (isLoggedIn.value) {
      try {
        await $fetch('/api/user/folders', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: { name: trimmed }
        })
      } catch (e) {}
    }
  }

  const renameFolder = async (oldName: string, newName: string) => {
    const trimmed = newName.trim()
    if (!trimmed || trimmed === oldName) return
    if (folders.value.some(f => f.name === trimmed)) return

    const target = folders.value.find(f => f.name === oldName)
    if (target) target.name = trimmed

    if (activeFolder.value === oldName) activeFolder.value = trimmed

    bookmarks.value.forEach(b => {
      if (b.folder === oldName) b.folder = trimmed
    })

    saveToStorage()
    saveFoldersToStorage()

    if (isLoggedIn.value) {
      try {
        await $fetch('/api/user/folders', {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: { oldName, newName: trimmed }
        })
      } catch (e) {}
    }
  }

  const deleteFolder = async (folderName: string) => {
    folders.value = folders.value.filter(f => f.name !== folderName)
    if (activeFolder.value === folderName) activeFolder.value = 'all'
    bookmarks.value.forEach(b => { if (b.folder === folderName) b.folder = undefined })
    saveToStorage()
    saveFoldersToStorage()
    if (isLoggedIn.value) {
      try {
        await $fetch('/api/user/folders', {
          method: 'DELETE',
          headers: getAuthHeaders(),
          query: { name: folderName },
          body: { name: folderName }
        })
      } catch (e) {
        console.error('Failed to sync folder deletion to server', e)
      }
    }
  }

  const assignBookmarkToFolder = async (bookmarkId: string, folderName: string) => {
    const target = bookmarks.value.find(b => b.id === bookmarkId)
    if (target) {
      target.folder = folderName === 'none' || folderName === 'all' ? undefined : folderName
      saveToStorage()
      if (isLoggedIn.value) {
        try {
          await $fetch('/api/user/bookmarks', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: target
          })
        } catch (e) {}
      }
    }
  }

  const removeBookmarkFromFolder = async (bookmarkId: string) => {
    const target = bookmarks.value.find(b => b.id === bookmarkId)
    if (target) {
      target.folder = undefined
      saveToStorage()
      if (isLoggedIn.value) {
        try {
          await $fetch('/api/user/bookmarks', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: target
          })
        } catch (e) {}
      }
    }
  }

  const getBookmarksInFolder = (folderName: string) => bookmarks.value.filter(b => b.folder === folderName)

  const filteredAndSortedBookmarks = computed(() => {
    let result = deduplicateBookmarks(bookmarks.value)
    if (activeFolder.value !== 'all') {
      result = result.filter(b => b.folder === activeFolder.value)
    }
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim()
      result = result.filter(b =>
        (b.title && b.title.toLowerCase().includes(q)) ||
        (b.url && b.url.toLowerCase().includes(q)) ||
        (b.description && b.description.toLowerCase().includes(q)) ||
        (b.summary && b.summary.toLowerCase().includes(q)) ||
        (b.tags && Array.isArray(b.tags) && b.tags.some(t => t && String(t).toLowerCase().includes(q)))
      )
    }
    result.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      if (currentSort.value === 'time-desc') return (b.createdAt || '').localeCompare(a.createdAt || '')
      if (currentSort.value === 'time-asc') return (a.createdAt || '').localeCompare(b.createdAt || '')
      if (currentSort.value === 'name-asc') return a.title.localeCompare(b.title, 'zh-CN')
      return 0
    })
    return result
  })

  const setColumns = (cols: GridColumns) => {
    columns.value = cols
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY_COLUMNS, String(cols))
  }

  const addBookmark = async (bookmark: Omit<Bookmark, 'id'>) => {
    const targetNorm = normalizeUrl(bookmark.url)
    const existingIndex = bookmarks.value.findIndex(b => normalizeUrl(b.url) === targetNorm)
    const isUpdate = existingIndex !== -1
    let savedBm: Bookmark

    if (isUpdate) {
      savedBm = {
        ...bookmarks.value[existingIndex],
        ...bookmark,
        id: bookmarks.value[existingIndex].id
      }
      bookmarks.value[existingIndex] = savedBm
    } else {
      savedBm = {
        ...bookmark,
        id: 'bm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        createdAt: new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
      }
      bookmarks.value.unshift(savedBm)
    }

    saveToStorage()
    if (isLoggedIn.value) {
      try {
        const res = await $fetch<{ success: boolean; id?: string; isUpdate?: boolean }>('/api/user/bookmarks', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: savedBm
        })
        if (res && res.id && res.id !== savedBm.id) {
          savedBm.id = res.id
          saveToStorage()
        }
      } catch (err) {
        console.error('Failed to sync bookmark to server', err)
      }
    }
    return { bookmark: savedBm, isUpdate }
  }

  const updateBookmark = async (id: string, updates: Partial<Bookmark>) => {
    const idx = bookmarks.value.findIndex(b => b.id === id)
    if (idx !== -1) {
      bookmarks.value[idx] = { ...bookmarks.value[idx], ...updates }
      saveToStorage()
      if (isLoggedIn.value) {
        try {
          await $fetch('/api/user/bookmarks', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: bookmarks.value[idx]
          })
        } catch (err) {
          console.error('Failed to update bookmark on server', err)
        }
      }
    }
  }

  const deleteBookmark = async (id: string) => {
    const target = bookmarks.value.find(b => b.id === id)
    const targetUrl = target?.url
    bookmarks.value = bookmarks.value.filter(b => b.id !== id)
    saveToStorage()
    if (isLoggedIn.value) {
      try {
        await $fetch('/api/user/bookmarks', {
          method: 'DELETE',
          headers: getAuthHeaders(),
          query: { id, url: targetUrl },
          body: { id, url: targetUrl }
        })
      } catch (err) {
        console.error('Failed to delete bookmark on server', err)
      }
    }
  }

  const togglePin = async (id: string) => {
    const target = bookmarks.value.find(b => b.id === id)
    if (target) {
      target.isPinned = !target.isPinned
      saveToStorage()
      if (isLoggedIn.value) {
        try {
          await $fetch('/api/user/bookmarks', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: target
          })
        } catch (e) {}
      }
    }
  }

  const toggleFavorite = async (id: string) => {
    const target = bookmarks.value.find(b => b.id === id)
    if (target) {
      target.isFavorite = !target.isFavorite
      saveToStorage()
      if (isLoggedIn.value) {
        try {
          await $fetch('/api/user/bookmarks', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: target
          })
        } catch (e) {}
      }
    }
  }

  onMounted(() => { if (!isLoaded.value) initData() })
  if (typeof window !== 'undefined' && !isLoaded.value) initData()

  return {
    bookmarks,
    folders,
    activeFolder,
    columns,
    searchQuery,
    currentSort,
    filteredAndSortedBookmarks,
    isLoaded,
    loadFromBackend,
    addFolder,
    renameFolder,
    deleteFolder,
    assignBookmarkToFolder,
    removeBookmarkFromFolder,
    getBookmarksInFolder,
    setColumns,
    addBookmark,
    updateBookmark,
    deleteBookmark,
    togglePin,
    toggleFavorite
  }
}

// =============================================================================
// 4. AI 总结交互状态 (useAiSummary)
// =============================================================================
export interface SummaryResult {
  title: string
  url: string
  tags?: string[]
  detailedSummary: string
  timestamp: string
}

const urlInput = ref('')
const isGenerating = ref(false)
const isTyping = ref(false)
const streamedText = ref('')
const result = ref<SummaryResult | null>(null)
const errorMessage = ref('')

export const useAiSummary = () => {
  const canSubmit = computed(() => {
    return !!urlInput.value.trim() && !isGenerating.value && !isTyping.value
  })

  const clearAll = () => {
    urlInput.value = ''
    isGenerating.value = false
    isTyping.value = false
    streamedText.value = ''
    result.value = null
    errorMessage.value = ''
  }

  const generateSummary = async (
    targetUrl?: string,
    onStartTyping?: () => void,
    onChunk?: () => void,
    options?: { title?: string; content?: string }
  ) => {
    const queryUrl = (targetUrl || urlInput.value).trim()
    if (!queryUrl) return

    urlInput.value = queryUrl
    errorMessage.value = ''
    isGenerating.value = true
    isTyping.value = false
    streamedText.value = ''
    result.value = null

    try {
      const data = await $fetch<{
        success: boolean
        title: string
        url: string
        detailedSummary: string
      }>('/api/summarize', {
        method: 'POST',
        body: {
          url: queryUrl,
          title: options?.title,
          content: options?.content
        }
      })

      if (data && (data.detailedSummary || data.success)) {
        isGenerating.value = false
        isTyping.value = true
        if (onStartTyping) onStartTyping()

        const fullText = data.detailedSummary || ''
        let cur = ''
        for (let i = 0; i < fullText.length; i++) {
          cur += fullText[i]
          streamedText.value = cur
          if (i % 8 === 0) {
            if (onChunk) onChunk()
            await new Promise(r => setTimeout(r, 12))
          }
        }

        result.value = {
          title: data.title,
          url: data.url,
          detailedSummary: fullText,
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        }
      }
    } catch (err: any) {
      errorMessage.value = err?.data?.statusMessage || err?.data?.message || err?.message || '总结生成失败，请检查网络或链接'
    } finally {
      isGenerating.value = false
      isTyping.value = false
    }
  }

  return {
    urlInput,
    isGenerating,
    isTyping,
    streamedText,
    result,
    errorMessage,
    canSubmit,
    clearAll,
    generateSummary
  }
}

// =============================================================================
// 5. SVG 图标路径字典 (集中维护，零外部组件依赖)
// =============================================================================
export const ICONS: Record<string, string> = {
  menu: '<line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line>',
  search: '<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>',
  sparkles: '<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path><path d="M5 3v4"></path><path d="M19 17v4"></path><path d="M3 5h4"></path><path d="M17 19h4"></path>',
  'grid-1': '<rect x="4" y="4" width="16" height="16" rx="2"></rect><line x1="4" y1="12" x2="20" y2="12"></line>',
  'grid-2': '<rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="12" y1="3" x2="12" y2="21"></line>',
  'grid-3': '<rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line>',
  'grid-4': '<rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="7.5" y1="3" x2="7.5" y2="21"></line><line x1="12" y1="3" x2="12" y2="21"></line><line x1="16.5" y1="3" x2="16.5" y2="21"></line>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>',
  edit: '<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>',
  trash: '<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line>',
  close: '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>',
  bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>',
  'bookmark-check': '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path><path d="m9 10 2 2 4-4"></path>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>',
  pin: '<line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path>',
  favorite: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>',
  check: '<polyline points="20 6 9 17 4 12"></polyline>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle>',
  'eye-off': '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" y1="2" x2="22" y2="22"></line>',
  sun: '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line>',
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>',
  bot: '<rect width="18" height="12" x="3" y="6" rx="2"></rect><path d="M9 12h6"></path><path d="M12 3v3"></path>',
  'file-text': '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line>',
  folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>',
  external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line>',
  alert: '<circle cx="12" cy="12" r="10"></line><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>',
  github: '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>'
}
