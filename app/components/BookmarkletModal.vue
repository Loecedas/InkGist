<template>
  <div v-if="modelValue" class="modal-backdrop" @click.self="closeModal">
    <div class="bookmarklet-modal-card" role="dialog" aria-modal="true" aria-labelledby="bookmarklet-modal-title">
      <!-- 弹窗头部 -->
      <div class="modal-header">
        <div class="modal-title-group">
          <div class="modal-icon-badge">
            <svg class="svg-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.sparkles"></svg>
          </div>
          <div>
            <h3 id="bookmarklet-modal-title" class="modal-title">浏览器小书签 (Bookmarklet)</h3>
            <p class="modal-subtitle">无需安装任何浏览器扩展，拖拽到书签栏即可在任意网页一键使用</p>
          </div>
        </div>
        <button class="modal-close-btn" title="关闭弹窗" @click="closeModal">
          <svg class="svg-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.close"></svg>
        </button>
      </div>

      <!-- 分段胶囊 Tab 切换 -->
      <div class="tab-switcher-container">
        <div class="segmented-control">
          <button
            type="button"
            class="segment-tab-btn"
            :class="{ active: activeTab === 'snapshot' }"
            @click="activeTab = 'snapshot'"
          >
            <svg class="svg-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.camera"></svg>
            <span>网页离线快照 (全量图文)</span>
          </button>

          <button
            type="button"
            class="segment-tab-btn"
            :class="{ active: activeTab === 'summarize' }"
            @click="activeTab = 'summarize'"
          >
            <svg class="svg-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.sparkles"></svg>
            <span>AI 智能速读总结</span>
          </button>
        </div>
      </div>

      <!-- 核心小书签拖拽与复制区域 -->
      <div class="modal-body">
        <!-- 拖拽胶囊卡片 -->
        <div class="drag-action-hero">
          <div class="drag-badge-label">
            <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.pin"></svg>
            <span>电脑端：按住下方胶囊按钮直接拖拽到浏览器书签栏</span>
          </div>

          <!-- 可拖拽的书签链接 -->
          <div class="bookmarklet-link-wrapper">
            <a
              :href="currentBookmarkletCode"
              class="bookmarklet-pill-link"
              title="按住鼠标左键，直接拖拽此按钮到您的浏览器书签栏"
              @click.prevent="handleLinkClick"
            >
              <svg class="svg-icon pill-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="activeTab === 'snapshot' ? ICONS.camera : ICONS.pin"></svg>
              <span>{{ activeTab === 'snapshot' ? '墨萃 · 网页快照' : '墨萃 · 一键总结' }}</span>
            </a>
          </div>

          <p v-if="clickTipVisible" class="click-warning-tip">
            💡 请按住上方按钮并<strong>拖拽到浏览器书签栏</strong>，而不是直接点击哦！
          </p>

          <div class="shortcut-tip">
            <span>快捷键显示/隐藏书签栏：</span>
            <kbd>Ctrl+Shift+B</kbd>
            <span class="tip-sep">/</span>
            <span>Mac</span>
            <kbd>⌘+Shift+B</kbd>
          </div>
        </div>

        <!-- 备选：复制脚本代码 -->
        <div class="code-copy-section">
          <div class="section-title-row">
            <span class="section-title">无法拖拽或手机端使用？复制代码手动添加：</span>
            <button
              class="copy-code-btn"
              :class="{ 'is-copied': copied }"
              :title="copied ? '已复制到剪贴板' : '复制书签脚本代码'"
              @click="copyBookmarkletCode"
            >
              <svg class="svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="copied ? ICONS.check : ICONS.copy"></svg>
              <span>{{ copied ? '已复制代码' : '复制代码' }}</span>
            </button>
          </div>
          <div class="code-preview-box">
            <code>{{ currentBookmarkletCode }}</code>
          </div>
        </div>

        <!-- 详细使用指引 -->
        <div class="instructions-container">
          <h4 class="guide-title">
            {{ activeTab === 'snapshot' ? '网页快照小书签使用指南' : 'AI 总结小书签使用指南' }}
          </h4>
          <div class="steps-grid">
            <div class="step-card">
              <div class="step-header">
                <span class="step-num">1</span>
                <strong class="step-title">安装小书签</strong>
              </div>
              <p class="step-desc">
                按快捷键显示浏览器书签栏，将上方胶囊按钮直接拖入书签栏中完成添加。
              </p>
            </div>

            <div class="step-card">
              <div class="step-header">
                <span class="step-num">2</span>
                <strong class="step-title">浏览任意网页</strong>
              </div>
              <p class="step-desc">
                阅读知乎、微信公众号、CSDN、论坛长帖、维基百科或资讯时，点击书签栏上的小书签。
              </p>
            </div>

            <div class="step-card">
              <div class="step-header">
                <span class="step-num">3</span>
                <strong class="step-title">{{ activeTab === 'snapshot' ? '生成离线永久快照' : '自动提炼核心知识' }}</strong>
              </div>
              <p class="step-desc" v-if="activeTab === 'snapshot'">
                自动突破折叠与反爬限制，捕获 100% 全量图文并生成专属永久离线网址。
              </p>
              <p class="step-desc" v-else>
                在新标签页打开墨萃，自动开始深度总结并一键沉淀存入书签库。
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部操作按钮 -->
      <div class="modal-footer">
        <button class="modal-footer-btn" @click="closeModal">我知道了</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { ICONS } from '../pages/state'

const props = withDefaults(defineProps<{
  modelValue: boolean
  defaultTab?: 'summarize' | 'snapshot'
}>(), {
  defaultTab: 'snapshot'
})

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
}>()

const activeTab = ref<'summarize' | 'snapshot'>(props.defaultTab)
const copied = ref(false)
const clickTipVisible = ref(false)
const siteOrigin = ref('')

watch(() => props.defaultTab, (tab) => {
  if (tab) activeTab.value = tab
})

watch(() => props.modelValue, (val) => {
  if (typeof document !== 'undefined') {
    if (val) {
      document.body.style.overflow = 'hidden'
      if (props.defaultTab) activeTab.value = props.defaultTab
    } else {
      document.body.style.overflow = ''
    }
  }
}, { immediate: true })

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.modelValue) {
    closeModal()
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    siteOrigin.value = window.location.origin
    window.addEventListener('keydown', handleKeyDown)
  }
})

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeyDown)
  }
})

// 1. AI 深度总结小书签代码
const summarizeBookmarkletCode = computed(() => {
  const origin = siteOrigin.value || (typeof window !== 'undefined' ? window.location.origin : '')
  return `javascript:(function(){var url=encodeURIComponent(location.href);var title=encodeURIComponent(document.title||'');var sel=encodeURIComponent(window.getSelection().toString());window.open('${origin}/?autoSummarize=true&url='+url+'&title='+title+'&text='+sel,'_blank');})();`
})

// 2. 网页离线快照小书签代码 (无任何多余弹窗干扰，100% 原样捕获 DOM、论坛全帖、动态样式、图片，支持 Trusted Types 及 GitHub/Twitter 等极严 CSP 网站)
const snapshotBookmarkletCode = computed(() => {
  const origin = siteOrigin.value || (typeof window !== 'undefined' ? window.location.origin : '')
  return `javascript:(function(){try{var o='${origin}';var sendSnapshot=function(fullHtml,title,desc,coverImg,ptLen){var id='snap_'+Date.now()+'_'+Math.random().toString(36).substring(2,7);var payload={type:'INKGIST_SAVE_SNAPSHOT',id:id,url:location.href,title:title,description:desc||'',siteName:document.querySelector('meta[property=\"og:site_name\"]')?.content||location.hostname,coverImage:coverImg||'',contentHtml:fullHtml,wordCount:ptLen};var targetWindow=window.open(o+'/snapshot/receiver','_blank');if(targetWindow){var sent=false;var sendPayload=function(){if(sent||!targetWindow||targetWindow.closed)return;try{targetWindow.postMessage(payload,'*');}catch(e){}};var onMsg=function(e){if(e.data&&(e.data.type==='INKGIST_RECEIVER_READY'||e.data.type==='INKGIST_SNAPSHOT_SAVED')){sendPayload();if(e.data.type==='INKGIST_SNAPSHOT_SAVED'){sent=true;window.removeEventListener('message',onMsg);}}};window.addEventListener('message',onMsg);var retryCount=0;var interval=setInterval(function(){retryCount++;if(sent||retryCount>60||!targetWindow||targetWindow.closed){clearInterval(interval);return;}sendPayload();},100);}else{alert('请允许浏览器弹出窗口，以便完成快照离线保存');}};var captureDom=function(){var clone=document.documentElement.cloneNode(true);var head=clone.querySelector('head')||clone.insertBefore(document.createElement('head'),clone.firstChild);var ref=document.createElement('meta');ref.name='referrer';ref.content='no-referrer';head.insertBefore(ref,head.firstChild);var base=document.createElement('base');base.href=location.href;base.target='_blank';head.insertBefore(base,head.firstChild);try{var extraCss='';for(var s=0;s<document.styleSheets.length;s++){var sheet=document.styleSheets[s];try{if(sheet.ownerNode&&sheet.ownerNode.tagName==='STYLE'&&!sheet.ownerNode.textContent.trim()){var rules=sheet.cssRules||sheet.rules;if(rules){for(var r=0;r<rules.length;r++){extraCss+=rules[r].cssText+'\\n';}}}}catch(e){}}if(document.adoptedStyleSheets&&document.adoptedStyleSheets.length>0){for(var a=0;a<document.adoptedStyleSheets.length;a++){try{var arules=document.adoptedStyleSheets[a].cssRules;if(arules){for(var ar=0;ar<arules.length;ar++){extraCss+=arules[ar].cssText+'\\n';}}}catch(e){}}}if(extraCss){var st=document.createElement('style');st.setAttribute('data-inkgist-extracted','true');st.textContent=extraCss;head.appendChild(st);}}catch(e){}try{var csdn=clone.querySelector('#article_content,.article_content');if(csdn){csdn.style.setProperty('height','auto','important');csdn.style.setProperty('max-height','none','important');csdn.style.setProperty('overflow','visible','important');}var zhihu=clone.querySelectorAll('.RichContent.is-collapsed,.RichContent-inner');for(var zh=0;zh<zhihu.length;zh++){zhihu[zh].classList.remove('is-collapsed');zhihu[zh].style.setProperty('max-height','none','important');zhihu[zh].style.setProperty('height','auto','important');}var csdnDupes=clone.querySelectorAll('.csdn-toolbar-fixed,#csdn-toolbar-search,.toolbar-search-drop,.bk-suggest,.wgt-suggest,.search-suggest,.sug-wrapper,.suggestions,.wgt-searchbar-main_help,.wgt-searchbar-main__help,.help-box');for(var cd=0;cd<csdnDupes.length;cd++){csdnDupes[cd].remove();}var masks=clone.querySelectorAll('.hide-article-box,.hide-article-box-btn,#btn-readmore,.read-more-btn,.passport-login-container,.login-mark');for(var m=0;m<masks.length;m++){masks[m].remove();}}catch(e){}var origImgs=document.querySelectorAll('img');var cloneImgs=clone.querySelectorAll('img');var ci='';for(var i=0;i<origImgs.length&&i<cloneImgs.length;i++){var realSrc=origImgs[i].currentSrc||origImgs[i].src||origImgs[i].getAttribute('data-src')||origImgs[i].getAttribute('data-actualsrc')||origImgs[i].getAttribute('data-original')||origImgs[i].getAttribute('data-lazy-src')||origImgs[i].getAttribute('data-origin-src')||origImgs[i].getAttribute('data-hi-res-src')||origImgs[i].getAttribute('data-zoom-src')||origImgs[i].getAttribute('data-url');if(realSrc){cloneImgs[i].src=realSrc;cloneImgs[i].removeAttribute('loading');if(cloneImgs[i].style.opacity==='0')cloneImgs[i].style.opacity='1';if(cloneImgs[i].style.visibility==='hidden')cloneImgs[i].style.visibility='visible';if(!ci&&!/icon|avatar|logo|spacer|blank\\.gif|\\.svg/i.test(realSrc))ci=realSrc;}}var origCanvases=document.querySelectorAll('canvas');var cloneCanvases=clone.querySelectorAll('canvas');for(var c=0;c<origCanvases.length&&c<cloneCanvases.length;c++){try{var dataUrl=origCanvases[c].toDataURL();if(dataUrl&&dataUrl.length>30){var cImg=document.createElement('img');cImg.src=dataUrl;cImg.style.cssText=origCanvases[c].style.cssText;cImg.className=origCanvases[c].className;if(cloneCanvases[c].parentNode){cloneCanvases[c].parentNode.replaceChild(cImg,cloneCanvases[c]);}}}catch(e){}}var title=document.title||document.querySelector('h1')?.innerText||location.hostname;var desc=document.querySelector('meta[name=\"description\"]')?.content||document.querySelector('meta[property=\"og:description\"]')?.content||'';var pt=(document.body.textContent||'').replace(/\\s+/g,' ').trim();var fullHtmlText='<!DOCTYPE html>\\n'+(window.XMLSerializer?new XMLSerializer().serializeToString(clone):clone.outerHTML);sendSnapshot(fullHtmlText,title,desc||pt.slice(0,200),ci||document.querySelector('meta[property=\"og:image\"]')?.content||'',pt.length);};if(window.Discourse||/\\/t\\/(?:[^\\/]+\\/)?\\d+/.test(location.pathname)){fetch(location.pathname.replace(/\\/$/,'')+'.json').then(function(res){return res.json();}).then(function(data){if(data&&data.post_stream&&data.post_stream.posts&&data.post_stream.posts.length>0){var title=data.title||document.title;var siteUrl=location.origin;var postsHtml=data.post_stream.posts.map(function(post){var avatar=post.avatar_template?post.avatar_template.replace('{size}','48'):'';if(avatar&&!avatar.startsWith('http'))avatar=siteUrl+avatar;return '<article style=\"padding:20px 0;border-bottom:1px solid #e2e8f0;display:flex;gap:16px;\"><div style=\"flex-shrink:0;\"><img src=\"'+avatar+'\" style=\"width:44px;height:44px;border-radius:50%;\"></div><div style=\"flex:1;min-width:0;\"><div style=\"display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:13px;\"><strong style=\"color:#0f172a;\">'+(post.name||post.username)+'</strong><span style=\"color:#64748b;\">@'+post.username+'</span><span style=\"color:#94a3b8;margin-left:auto;\">#'+post.post_number+' · '+(post.created_at?post.created_at.slice(0,10):'')+'</span></div><div style=\"font-size:15px;line-height:1.7;color:#1e293b;\">'+post.cooked+'</div></div></article>';}).join('\\n');var fullHtml='<!DOCTYPE html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><meta name=\"referrer\" content=\"no-referrer\"><base href=\"'+siteUrl+'\" target=\"_blank\"><title>'+title+'</title><style>body{font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,sans-serif;max-width:900px;margin:0 auto;padding:24px 20px;color:#0f172a;}h1.topic-title{font-size:24px;font-weight:700;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #0f172a;}img{max-width:100%;height:auto;border-radius:6px;}blockquote{margin:12px 0;padding:8px 16px;border-left:4px solid #cbd5e1;background:#f8fafc;color:#475569;}pre{background:#0f172a;color:#f8fafc;padding:14px;border-radius:8px;overflow-x:auto;font-size:13px;}</style></head><body><h1 class=\"topic-title\">'+title+'</h1><div>'+postsHtml+'</div></body></html>';sendSnapshot(fullHtml,title,data.title,'',postsHtml.length);}else{captureDom();}}).catch(function(){captureDom();});}else{captureDom();}}catch(e){alert('快照提取失败: '+e.message);}})();`
})

const currentBookmarkletCode = computed(() => {
  return activeTab.value === 'snapshot' ? snapshotBookmarkletCode.value : summarizeBookmarkletCode.value
})

const closeModal = () => {
  clickTipVisible.value = false
  emit('update:modelValue', false)
}

const handleLinkClick = () => {
  clickTipVisible.value = true
  setTimeout(() => {
    clickTipVisible.value = false
  }, 4000)
}

const copyBookmarkletCode = async () => {
  try {
    await navigator.clipboard.writeText(currentBookmarkletCode.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy bookmarklet code:', err)
  }
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background-color: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: fadeIn 0.15s ease-out;
}

.bookmarklet-modal-card {
  width: 100%;
  max-width: 620px;
  background-color: var(--bg-surface, #ffffff);
  border: 1px solid var(--border-subtle, #e2e8f0);
  border-radius: var(--radius-lg, 14px);
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-modal, 0 20px 25px -5px rgba(15, 23, 42, 0.1));
  overflow: hidden;
  max-height: 90vh;
  box-sizing: border-box;
}

/* 弹窗头部 */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  border-bottom: 1px solid var(--border-subtle, #e2e8f0);
}

.modal-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-icon-badge {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-md, 10px);
  background: var(--bg-surface-subtle, #f8fafc);
  border: 1px solid var(--border-subtle, #e2e8f0);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-main, #0f172a);
  flex-shrink: 0;
}

.modal-title {
  margin: 0 0 2px;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-main, #0f172a);
  letter-spacing: -0.01em;
}

.modal-subtitle {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted, #64748b);
  line-height: 1.4;
}

.modal-close-btn {
  background: transparent;
  border: none;
  color: var(--text-muted, #64748b);
  cursor: pointer;
  padding: 6px;
  border-radius: var(--radius-sm, 6px);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.modal-close-btn:hover {
  background: var(--bg-surface-hover, #f1f5f9);
  color: var(--text-main, #0f172a);
}

/* 分段切换栏 (Segmented Control) */
.tab-switcher-container {
  padding: 12px 24px 0;
}

.segmented-control {
  display: flex;
  background: var(--bg-surface-subtle, #f1f5f9);
  border: 1px solid var(--border-subtle, #e2e8f0);
  padding: 3px;
  border-radius: var(--radius-md, 10px);
  gap: 4px;
}

.segment-tab-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 7px 12px;
  font-size: 13px;
  font-weight: 500;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm, 7px);
  color: var(--text-muted, #64748b);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.segment-tab-btn:hover {
  color: var(--text-main, #0f172a);
}

.segment-tab-btn.active {
  background: var(--bg-surface, #ffffff);
  color: var(--text-main, #0f172a);
  font-weight: 600;
  box-shadow: var(--shadow-xs, 0 1px 2px rgba(0, 0, 0, 0.05));
}

html.dark .segment-tab-btn.active {
  background: var(--bg-surface-hover, #1f293d);
}

.modal-body {
  padding: 20px 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* 拖拽英雄区 */
.drag-action-hero {
  background: var(--bg-surface-subtle, #f8fafc);
  border: 1px solid var(--border-subtle, #e2e8f0);
  border-radius: var(--radius-md, 10px);
  padding: 20px 16px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.drag-badge-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted, #475569);
}

.bookmarklet-pill-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 24px;
  background: var(--primary, #0f172a);
  color: var(--primary-contrast, #ffffff) !important;
  font-size: 14px;
  font-weight: 600;
  border-radius: var(--radius-full, 9999px);
  text-decoration: none;
  cursor: grab;
  box-shadow: var(--shadow-md, 0 4px 6px -1px rgba(15, 23, 42, 0.1));
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  user-select: none;
}

.bookmarklet-pill-link:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(15, 23, 42, 0.15));
}

.bookmarklet-pill-link:active {
  cursor: grabbing;
}

.pill-icon {
  flex-shrink: 0;
}

.click-warning-tip {
  margin: 0;
  font-size: 12px;
  color: var(--warning-700, #b45309);
  animation: fadeIn 0.2s ease;
}

.shortcut-tip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--text-subtle, #94a3b8);
}

.tip-sep {
  opacity: 0.5;
}

kbd {
  display: inline-block;
  padding: 2px 5px;
  font-size: 11px;
  font-family: inherit;
  font-weight: 600;
  background: var(--bg-surface, #ffffff);
  border: 1px solid var(--border-strong, #cbd5e1);
  border-radius: 4px;
  color: var(--text-main, #0f172a);
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);
}

/* 复制代码区 */
.code-copy-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-muted, #475569);
}

.copy-code-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  background: var(--bg-surface, #ffffff);
  border: 1px solid var(--border-subtle, #e2e8f0);
  color: var(--text-main, #0f172a);
  border-radius: var(--radius-sm, 6px);
  cursor: pointer;
  box-shadow: var(--shadow-xs, 0 1px 2px rgba(0, 0, 0, 0.04));
  transition: all 0.15s ease;
}

.copy-code-btn:hover {
  background: var(--bg-surface-hover, #f1f5f9);
  border-color: var(--border-strong, #cbd5e1);
}

.copy-code-btn.is-copied {
  background: var(--success-50, #ecfdf5);
  border-color: var(--success, #10b981);
  color: var(--success-700, #047857);
}

.code-preview-box {
  background: var(--bg-surface-subtle, #f8fafc);
  border: 1px solid var(--border-subtle, #e2e8f0);
  border-radius: var(--radius-sm, 6px);
  padding: 8px 12px;
  max-height: 48px;
  overflow-y: auto;
}

.code-preview-box code {
  font-family: var(--font-mono, monospace);
  font-size: 11px;
  color: var(--text-muted, #64748b);
  word-break: break-all;
  line-height: 1.4;
}

/* 步骤指引 */
.guide-title {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main, #0f172a);
}

.steps-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.step-card {
  background: var(--bg-surface-subtle, #f8fafc);
  border: 1px solid var(--border-subtle, #e2e8f0);
  border-radius: var(--radius-md, 8px);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.step-num {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--primary, #0f172a);
  color: var(--primary-contrast, #ffffff);
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-title {
  font-size: 12px;
  color: var(--text-main, #0f172a);
}

.step-desc {
  margin: 0;
  font-size: 11px;
  color: var(--text-muted, #64748b);
  line-height: 1.4;
}

/* 底部操作 */
.modal-footer {
  padding: 14px 24px;
  border-top: 1px solid var(--border-subtle, #e2e8f0);
  display: flex;
  justify-content: flex-end;
}

.modal-footer-btn {
  padding: 7px 20px;
  border-radius: var(--radius-sm, 6px);
  background: var(--primary, #0f172a);
  color: var(--primary-contrast, #ffffff);
  border: 1px solid var(--primary, #0f172a);
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.modal-footer-btn:hover {
  opacity: 0.9;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}

@media (max-width: 600px) {
  .steps-grid {
    grid-template-columns: 1fr;
  }
}

/* 移动端 (如 375px ~ 420px 屏幕) 下将两个 Tab 垂直分两行排布 */
@media (max-width: 480px) {
  .tab-switcher-container {
    padding: 10px 16px 0;
  }

  .segmented-control {
    flex-direction: column;
    gap: 6px;
  }

  .segment-tab-btn {
    width: 100%;
    padding: 8px 12px;
    justify-content: center;
    white-space: nowrap;
  }
}
</style>
