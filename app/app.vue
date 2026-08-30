<template>
  <div class="app-root">
    <div class="app-page-content">
      <NuxtPage />
    </div>
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import AppFooter from './components/AppFooter.vue'
</script>

<style>
/* ==========================================================================
   全局设计规范与水墨画质感样式 (整合内联，精简根目录)
   ========================================================================== */
:root {
  --slate-50: #f8fafc;
  --slate-100: #f1f5f9;
  --slate-200: #e2e8f0;
  --slate-300: #cbd5e1;
  --slate-400: #94a3b8;
  --slate-500: #64748b;
  --slate-600: #475569;
  --slate-700: #334155;
  --slate-800: #1e293b;
  --slate-900: #0f172a;
  --slate-950: #020617;

  --primary: #0f172a;
  --primary-hover: #1e293b;
  --primary-50: #f1f5f9;
  --primary-100: #e2e8f0;
  --primary-700: #020617;
  --primary-contrast: #ffffff;

  --link-blue: #2563eb;
  --link-blue-hover: #1d4ed8;

  --success: #10b981;
  --success-50: #ecfdf5;
  --success-700: #047857;

  --warning: #f59e0b;
  --warning-50: #fffbeb;
  --warning-700: #b45309;

  --danger: #ef4444;
  --danger-50: #fef2f2;
  --danger-700: #b91c1c;

  --bg-app: #f6f8fa;
  --bg-surface: #ffffff;
  --bg-surface-subtle: #f8fafc;
  --bg-surface-hover: #f1f5f9;
  --border-subtle: #e2e8f0;
  --border-strong: #cbd5e1;
  --border-focus: #0f172a;

  --text-main: #0f172a;
  --text-muted: #475569;
  --text-subtle: #94a3b8;
  --text-on-dark: #ffffff;

  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 18px;
  --radius-full: 9999px;

  --shadow-xs: 0 1px 2px 0 rgba(15, 23, 42, 0.04);
  --shadow-sm: 0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04);
  --shadow-md: 0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05);
  --shadow-lg: 0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04);
  --shadow-modal: 0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05);

  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans", sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

html.dark,
[data-theme="dark"] {
  --bg-app: #090d16;
  --bg-surface: #111827;
  --bg-surface-subtle: #1e293b;
  --bg-surface-hover: #1f293d;
  --border-subtle: #1f2937;
  --border-strong: #374151;
  --border-focus: #ffffff;

  --text-main: #f9fafb;
  --text-muted: #9ca3af;
  --text-subtle: #6b7280;

  --slate-50: #1e293b;
  --slate-100: #1f2937;
  --slate-200: #374151;
  --slate-300: #4b5563;

  --primary: #ffffff;
  --primary-hover: #f1f5f9;
  --primary-50: rgba(255, 255, 255, 0.1);
  --primary-100: rgba(255, 255, 255, 0.2);
  --primary-contrast: #090d16;

  --link-blue: #60a5fa;
  --link-blue-hover: #93c5fd;

  --shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
  --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.4);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.6);
  --shadow-card: 0 4px 20px -2px rgba(0, 0, 0, 0.5);
  --shadow-modal: 0 20px 25px -5px rgba(0, 0, 0, 0.7);
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

*::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

html, body {
  width: 100%;
  min-height: 100vh;
  font-family: var(--font-sans);
  color: var(--text-main);
  background-color: var(--bg-app);
  background-image:
    radial-gradient(at 15% 15%, rgba(203, 213, 225, 0.4) 0px, transparent 55%),
    radial-gradient(at 85% 85%, rgba(148, 163, 184, 0.28) 0px, transparent 60%),
    radial-gradient(at 50% 50%, rgba(226, 232, 240, 0.3) 0px, transparent 70%);
  background-attachment: fixed;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  scrollbar-width: none;
}

html.dark, html.dark body {
  background-image:
    radial-gradient(at 20% 20%, rgba(30, 41, 59, 0.6) 0px, transparent 55%),
    radial-gradient(at 80% 80%, rgba(15, 23, 42, 0.7) 0px, transparent 60%);
  background-attachment: fixed;
}

.svg-icon {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
  stroke: currentColor;
}

button {
  font-family: inherit;
  font-size: 0.875rem;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 0.875rem;
  border-radius: var(--radius-sm);
  font-weight: 500;
  transition: all 0.15s ease;
  user-select: none;
}

.btn-primary {
  background-color: var(--primary);
  color: var(--primary-contrast);
  border-color: var(--primary);
}
.btn-primary:hover:not(:disabled) {
  background-color: var(--primary-hover);
  border-color: var(--primary-hover);
}

.btn-secondary {
  background-color: var(--bg-surface);
  color: var(--text-muted);
  border-color: var(--border-subtle);
  box-shadow: var(--shadow-xs);
}
.btn-secondary:hover {
  background-color: var(--bg-surface-hover);
  color: var(--text-main);
  border-color: var(--border-strong);
}

.btn-flat {
  background-color: transparent;
  color: var(--text-muted);
}
.btn-flat:hover {
  background-color: var(--slate-100);
  color: var(--text-main);
}

.btn-icon {
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

input[type="text"],
input[type="url"],
input[type="number"],
input[type="search"],
input[type="password"],
textarea,
select {
  font-family: inherit;
  font-size: 0.875rem;
  color: var(--text-main);
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 0.55rem 0.75rem;
  width: 100%;
  transition: border-color 0.15s, box-shadow 0.15s;
}

input:focus, textarea:focus, select:focus {
  outline: none;
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
}

.homepage-layout,
.bookmarks-page-layout,
.login-page-layout {
  animation: pageFastIn 0.16s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes pageFastIn {
  from {
    opacity: 0.85;
    transform: translateY(3px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.app-root {
  min-height: 100vh;
  width: 100%;
  background-color: var(--bg-app);
  color: var(--text-main);
  display: flex;
  flex-direction: column;
}

.app-page-content {
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
}
</style>
