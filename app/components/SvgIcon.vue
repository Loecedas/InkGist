<template>
  <span
    class="svg-icon-wrap"
    :class="extraClass"
    :style="{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: (size || 14) + 'px',
      height: (size || 14) + 'px',
      lineHeight: '1',
      verticalAlign: 'middle',
      flexShrink: 0
    }"
    v-html="fullSvg"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ICONS } from '../pages/state'

const props = defineProps<{
  name?: string
  svg?: string
  size?: number | string
  extraClass?: string
}>()

const fullSvg = computed(() => {
  const inner = props.svg || (props.name ? ICONS[props.name] : '') || ''
  const s = props.size || 14
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;width:100%;height:100%;stroke:currentColor;">${inner}</svg>`
})
</script>
