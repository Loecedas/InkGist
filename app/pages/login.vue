<template>
  <div class="login-page-layout">
    <!-- 右上角主题切换 -->
    <div class="top-right-bar">
      <button class="theme-toggle-btn" :title="`当前主题：${currentLabel} (点击切换)`" @click="cycleTheme">
        <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="currentIconSvg"></svg>
        <span class="theme-label">{{ currentLabel }}</span>
      </button>
    </div>

    <!-- 居中登录 / 注册核心卡片 (已去除上方大图标与标题) -->
    <div class="auth-card-container">
      <div class="auth-box-card">
        <!-- 登录 / 注册 模式切换 Tab -->
        <div class="auth-tabs-row">
          <button
            type="button"
            class="tab-btn"
            :class="{ active: mode === 'login' }"
            @click="switchMode('login')"
          >
            <span>登录</span>
          </button>
          <button
            type="button"
            class="tab-btn"
            :class="{ active: mode === 'register' }"
            @click="switchMode('register')"
          >
            <span>注册新账号</span>
          </button>
        </div>

        <!-- 错误提示 -->
        <div v-if="errorMsg" class="auth-error-box">
          <svg class="svg-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.alert"></svg>
          <span>{{ errorMsg }}</span>
        </div>

        <!-- 成功提示 -->
        <div v-if="successMsg" class="auth-success-box">
          <svg class="svg-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.check"></svg>
          <span>{{ successMsg }}</span>
        </div>

        <!-- 登录/注册表单 -->
        <form class="auth-form-body" @submit.prevent="handleSubmit">
          <div class="form-item">
            <label class="item-label">用户名</label>
            <div class="input-wrapper">
              <span class="input-icon">
                <svg class="svg-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.user"></svg>
              </span>
              <input
                v-model="username"
                type="text"
                class="text-input"
                placeholder="请输入用户名 (至少2位)"
                autocomplete="username"
                required
              />
            </div>
          </div>

          <div class="form-item">
            <label class="item-label">密码</label>
            <div class="input-wrapper">
              <span class="input-icon">
                <svg class="svg-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.pin"></svg>
              </span>
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                class="text-input"
                placeholder="请输入密码 (至少6位)"
                autocomplete="current-password"
                required
              />
              <button
                type="button"
                class="btn-toggle-password"
                :title="showPassword ? '隐藏密码' : '显示密码'"
                @click="showPassword = !showPassword"
              >
                <svg class="svg-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="showPassword ? ICONS['eye-off'] : ICONS.eye"></svg>
              </button>
            </div>
          </div>

          <button
            type="submit"
            class="btn-submit-auth"
            :disabled="loading || !username.trim() || !password"
          >
            <span v-if="loading" class="spinner-dot"></span>
            <span>{{ loading ? '正在验证中...' : (mode === 'login' ? '立即登录并进入' : '完成注册并登录') }}</span>
          </button>
        </form>

        <div class="auth-footer-tips">
          <span v-if="mode === 'login'">
            还没有账号？
            <a href="javascript:void(0)" class="link-switch" @click="switchMode('register')">免费注册</a>
          </span>
          <span v-else>
            已有账号？
            <a href="javascript:void(0)" class="link-switch" @click="switchMode('login')">直接登录</a>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth, useTheme, ICONS } from './state'

const router = useRouter()
const route = useRoute()
const { isLoggedIn, login, register, fetchCurrentUser } = useAuth()
const { themeMode, cycleTheme } = useTheme()

const currentIconSvg = computed(() => {
  if (themeMode.value === 'dark') return ICONS.moon
  if (themeMode.value === 'light') return ICONS.sun
  return ICONS.monitor
})

const currentLabel = computed(() => {
  if (themeMode.value === 'dark') return '深色'
  if (themeMode.value === 'light') return '浅色'
  return '跟随系统'
})

const mode = ref<'login' | 'register'>('login')
const username = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const switchMode = (newMode: 'login' | 'register') => {
  mode.value = newMode
  errorMsg.value = ''
  successMsg.value = ''
}

const getTargetRedirectUrl = () => {
  const queryRedirect = route.query.redirect
  if (typeof queryRedirect === 'string' && queryRedirect.startsWith('/')) {
    return queryRedirect
  }
  return '/'
}

const handleSubmit = async () => {
  if (!username.value.trim() || !password.value) return
  loading.value = true
  errorMsg.value = ''
  successMsg.value = ''

  try {
    const targetUrl = getTargetRedirectUrl()
    if (mode.value === 'login') {
      const ok = await login(username.value.trim(), password.value)
      if (ok) {
        successMsg.value = '登录成功，正在进入...'
        setTimeout(() => {
          window.location.href = targetUrl
        }, 150)
      } else {
        const { authError } = useAuth()
        errorMsg.value = authError.value || '登录失败，请检查用户名或密码'
      }
    } else {
      const ok = await register(username.value.trim(), password.value)
      if (ok) {
        successMsg.value = '注册成功，正在进入...'
        setTimeout(() => {
          window.location.href = targetUrl
        }, 150)
      } else {
        const { authError } = useAuth()
        errorMsg.value = authError.value || '注册失败，该用户名可能已被占用'
      }
    }
  } catch (err: any) {
    errorMsg.value = err?.message || '操作失败，请重试'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await fetchCurrentUser()
  if (isLoggedIn.value) {
    window.location.href = '/'
  }
})
</script>

<style scoped>
.login-page-layout {
  min-height: calc(100vh - 4.5rem);
  min-height: calc(100dvh - 4.5rem);
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: var(--bg-app);
  color: var(--text-main);
  position: relative;
  padding: 1.5rem;
  box-sizing: border-box;
  animation: pageFastIn 0.16s cubic-bezier(0.16, 1, 0.3, 1);
}

.top-right-bar {
  position: fixed;
  top: 1.25rem;
  right: 1.5rem;
  z-index: 10;
}

.theme-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.38rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-main);
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  backdrop-filter: blur(8px);
}
.theme-toggle-btn:hover {
  border-color: var(--text-main);
  background-color: var(--slate-100);
}

.auth-card-container {
  width: 100%;
  max-width: 420px;
  margin: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.auth-box-card {
  width: 100%;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-modal);
  padding: 2.25rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.auth-tabs-row {
  display: flex;
  border-bottom: 2px solid var(--slate-100);
  gap: 1.5rem;
}

.tab-btn {
  background: transparent;
  border: none;
  font-size: 1.0625rem;
  font-weight: 600;
  color: var(--text-muted);
  padding: 0.5rem 0.25rem 0.75rem 0.25rem;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
}

.tab-btn.active {
  color: var(--text-main);
  font-weight: 700;
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background-color: var(--primary);
  border-radius: 2px;
}

.auth-error-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 0.85rem;
  background-color: var(--danger-50);
  border: 1px solid var(--danger);
  border-radius: var(--radius-md);
  color: var(--danger-700);
  font-size: 0.8125rem;
}

.auth-success-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 0.85rem;
  background-color: var(--success-50);
  border: 1px solid var(--success);
  border-radius: var(--radius-md);
  color: var(--success-700);
  font-size: 0.8125rem;
}

.auth-form-body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.item-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-muted);
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 0.75rem;
  color: var(--text-subtle);
  pointer-events: none;
  display: flex;
  align-items: center;
}

.text-input {
  width: 100%;
  padding-left: 2.25rem;
  padding-right: 2.5rem;
  height: 42px;
  background-color: var(--bg-surface-subtle);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  color: var(--text-main);
}

.text-input:focus {
  background-color: var(--bg-surface);
  border-color: var(--border-focus);
}

.btn-toggle-password {
  position: absolute;
  right: 0.5rem;
  background: transparent;
  border: none;
  color: var(--text-subtle);
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.btn-toggle-password:hover {
  background-color: var(--bg-surface-hover);
  color: var(--text-main);
}

.btn-submit-auth {
  margin-top: 0.5rem;
  height: 44px;
  background-color: var(--primary);
  color: var(--primary-contrast) !important;
  border-radius: var(--radius-md);
  font-size: 0.9375rem;
  font-weight: 600;
  border: 1px solid var(--primary);
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
}
.btn-submit-auth:hover:not(:disabled) {
  background-color: var(--primary-hover);
}
.btn-submit-auth:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.auth-footer-tips {
  text-align: center;
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.link-switch {
  color: var(--text-main);
  font-weight: 600;
  text-decoration: underline;
  margin-left: 0.25rem;
}
.link-switch:hover {
  color: var(--primary);
}
</style>
