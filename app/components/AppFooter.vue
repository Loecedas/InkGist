<template>
  <footer class="app-simple-footer">
    <span class="copyright-text">© {{ currentYear }} · 墨萃 · InkGist</span>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const currentYear = computed(() => new Date().getFullYear())
</script>

<style scoped>
.app-simple-footer {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding-top: 0.75rem;
  padding-left: 1rem;
  padding-right: 1rem;
  padding-bottom: max(1.15rem, env(safe-area-inset-bottom, 1.15rem));
  margin-top: auto;
}

.copyright-text {
  font-size: 0.8125rem;
  color: var(--text-subtle);
  letter-spacing: 0.02em;
  user-select: none;
  transition: color 0.2s ease;
}

.copyright-text:hover {
  color: var(--text-muted);
}
</style>
