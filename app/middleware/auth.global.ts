import { defineNuxtRouteMiddleware, navigateTo, useCookie } from '#app'
import { useAuth } from '../pages/state'

export default defineNuxtRouteMiddleware((to) => {
  const sessionToken = useCookie('auth_session_token')
  const clientToken = useCookie('auth_client_token')

  // 1. 服务端 SSR 阶段拦截 (直接在服务端重定向，从根源消除首页闪烁)
  if (import.meta.server) {
    const hasCookie = !!sessionToken.value || !!clientToken.value
    if (!hasCookie && to.path !== '/login') {
      const redirectUrl = to.fullPath !== '/' ? `?redirect=${encodeURIComponent(to.fullPath)}` : ''
      return navigateTo(`/login${redirectUrl}`)
    }
    if (hasCookie && to.path === '/login') {
      return navigateTo('/')
    }
    return
  }

  // 2. 客户端 Hydration 及路由切换阶段拦截 (结合 LocalStorage 永久免登保障)
  if (import.meta.client) {
    const cachedUser = localStorage.getItem('auth_cached_user_v1')
    const cachedToken = localStorage.getItem('auth_cached_token_v1')
    const { currentUser } = useAuth()
    const hasAuth = !!cachedUser || !!cachedToken || !!currentUser.value || !!sessionToken.value || !!clientToken.value

    if (hasAuth && to.path === '/login') {
      return navigateTo('/')
    }
    if (!hasAuth && to.path !== '/login') {
      const redirectUrl = to.fullPath !== '/' ? `?redirect=${encodeURIComponent(to.fullPath)}` : ''
      return navigateTo(`/login${redirectUrl}`)
    }
  }
})
