<template>
  <div class="homepage-layout">
    <!-- 左上角极简悬浮小书签与系统更新按钮 -->
    <div class="top-left-floating-bar">
      <button class="nav-bookmarklet-btn" title="浏览器小书签 (Bookmarklet)" @click="showBookmarkletModal = true">
        <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.sparkles"></svg>
        <span>小书签</span>
      </button>

      <!-- 系统自动更新 -->
      <button class="nav-update-btn" :class="{ 'has-new-update': versionInfo.hasUpdate }" title="系统自动更新" @click="openUpdateModal">
        <svg class="svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.sync"></svg>
        <span>自动更新</span>
        <span v-if="versionInfo.hasUpdate" class="update-pulse-dot" title="发现可用新版本"></span>
      </button>
    </div>

    <!-- 右上角极简悬浮操作栏：退出登录 (左) + 跟随系统 (中) + 进入快照 (中) + 进入书签 (右) -->
    <div class="top-right-floating-bar">
      <!-- 1. 退出登录按钮 -->
      <button class="nav-logout-btn" title="退出登录" @click="handleLogout">
        <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.logout"></svg>
        <span>退出登录</span>
      </button>

      <!-- 2. 主题切换按钮 -->
      <button class="theme-toggle-btn" :title="`当前主题：${currentLabel} (点击切换)`" @click="cycleTheme">
        <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="currentIconSvg"></svg>
        <span class="theme-label">{{ currentLabel }}</span>
      </button>

      <!-- 3. 进入快照库按钮 -->
      <NuxtLink to="/snapshots" class="nav-switch-btn" title="进入网页快照库 (离线归档)">
        <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.camera"></svg>
        <span>快照</span>
      </NuxtLink>

      <!-- 4. 进入书签按钮 -->
      <NuxtLink to="/bookmarks" class="nav-switch-btn" title="进入书签库">
        <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.bookmark"></svg>
        <span>书签</span>
      </NuxtLink>
    </div>

    <!-- 首页主体核心功能区 -->
    <main class="homepage-main">
      <div class="summarizer-wrapper">
        <div class="summarizer-container">
          <!-- 首页顶部文案与标语 -->
          <div class="hero-intro-section">
            <div class="hero-badge">
              <span>AI 智能速读 · 一键精准提炼</span>
            </div>

            <h1 class="hero-title">让任何网页一目了然</h1>

            <p class="hero-description">
              输入任意网站链接，秒级提炼<strong>核心价值</strong>、<strong>功能说明</strong>与<strong>待办行动指南</strong>，告别冗长阅读。
            </p>

            <!-- 核心特色胶囊 (优雅矢量 SVG 图标) -->
            <div class="feature-highlights-row">
              <div class="highlight-chip">
                <svg class="svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.zap"></svg>
                <span>Defuddle 本地高效提取</span>
              </div>
              <div class="highlight-chip">
                <svg class="svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.bot"></svg>
                <span>大模型深度总结</span>
              </div>
              <div class="highlight-chip">
                <svg class="svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.bookmark"></svg>
                <span>一键同步至我的书签</span>
              </div>
            </div>
          </div>

          <!-- 连在一起的核心卡片大方框 (顶部控制台 + 所有输入方框 + 底部新增/导入按钮完全一体连结) -->
          <div class="main-unified-card">
            <!-- 1. 顶部批量操作控制台 (仅在存在多个网址时连在最上方，带丝滑过渡动画) -->
            <Transition name="batch-bar-slide">
              <div v-if="inputRows.length > 1" class="batch-control-toolbar">
                <div class="batch-summary-stats">
                  <span class="stat-badge">共 {{ inputRows.length }} 个网址</span>
                  <span v-if="completedCount > 0" class="stat-badge is-success">已完成 {{ completedCount }}</span>
                  <span v-if="activeConcurrentCount > 0" class="stat-badge is-running">并发提炼中 {{ activeConcurrentCount }}/5</span>
                  <span v-if="queuedCount > 0" class="stat-badge is-queued">排队中 {{ queuedCount }}</span>
                  <span v-if="pendingCount > 0" class="stat-badge is-pending">待总结 {{ pendingCount }}</span>
                </div>

                <div class="batch-actions-group">
                  <!-- 一键全部开始总结按钮 (纯黑白配色) -->
                  <button
                    v-if="pendingCount > 0 && activeConcurrentCount === 0 && queuedCount === 0"
                    type="button"
                    class="btn-primary btn-sm batch-action-btn"
                    :title="`一键开始总结所有待处理网址 (系统自动保持最多 5 个并发进行，其余自动排队)`"
                    @click="handleStartBatchAll"
                  >
                    <span>一键全部开始总结 ({{ pendingCount }} 个)</span>
                  </button>

                  <!-- 一键取消总结按钮 (纯黑白配色，正在提炼或排队时展示，点击瞬间全部中断停止) -->
                  <button
                    v-if="activeConcurrentCount > 0 || queuedCount > 0"
                    type="button"
                    class="btn-secondary btn-sm batch-action-btn btn-cancel-batch"
                    title="一键取消所有正在进行与排队中的总结任务"
                    @click="handleCancelBatchAll"
                  >
                    <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.close"></svg>
                    <span>一键取消总结 ({{ activeConcurrentCount + queuedCount }})</span>
                  </button>

                  <!-- 批量加入书签控制 (无重复时为普通大按钮，有已入库项时展示为下拉选择框) -->
                  <template v-if="unsavedCompletedCount > 0">
                    <!-- 情况 A：所有总结的链接均未被添加到书签库，显示常规大按钮 -->
                    <button
                      v-if="!hasCompletedInBookmarks"
                      type="button"
                      class="btn-primary btn-sm batch-action-btn"
                      :title="`一键将已生成的 ${unsavedCompletedCount} 个总结全部保存至书签库`"
                      @click="handleBatchSaveAllToBookmarks"
                    >
                      <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.bookmark"></svg>
                      <span>一键全部加入书签 ({{ unsavedCompletedCount }} 个)</span>
                    </button>

                    <!-- 情况 B：存在 1 个或多个已在书签库中的链接，展示下拉框形式提供两个选项 -->
                    <div v-else class="batch-dropdown-container">
                      <button
                        type="button"
                        class="btn-primary btn-sm batch-action-btn batch-dropdown-trigger"
                        :class="{ 'is-active': showBatchDropdown }"
                        title="批量处理书签 (点击展开操作选项)"
                        @click.stop="showBatchDropdown = !showBatchDropdown"
                      >
                        <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.bookmark"></svg>
                        <span>批量加入书签 ({{ unsavedCompletedCount }} 个)</span>
                        <svg class="svg-icon dropdown-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="showBatchDropdown ? ICONS.chevronUp : ICONS.chevronDown"></svg>
                      </button>

                      <Transition name="dropdown-pop">
                        <div v-if="showBatchDropdown" class="batch-dropdown-menu" @click.stop>
                          <!-- 选项一：覆盖相同书签 -->
                          <button
                            type="button"
                            class="dropdown-menu-item"
                            title="覆盖更新已存在的旧书签并加入新书签"
                            @click="handleBatchOverwriteBookmarks"
                          >
                            <svg class="svg-icon menu-item-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.refresh"></svg>
                            <div class="menu-item-text-group">
                              <span class="menu-item-title">覆盖相同书签</span>
                              <span class="menu-item-desc">自动覆盖更新 {{ completedInBookmarksCount }} 个已有书签，其余直接加入</span>
                            </div>
                          </button>

                          <!-- 选项二：一键加入书签 -->
                          <button
                            type="button"
                            class="dropdown-menu-item"
                            title="一键将所有已生成的总结加入书签库"
                            @click="handleBatchSaveAllToBookmarks"
                          >
                            <svg class="svg-icon menu-item-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.bookmark"></svg>
                            <div class="menu-item-text-group">
                              <span class="menu-item-title">一键加入书签</span>
                              <span class="menu-item-desc">一键将已生成的 {{ unsavedCompletedCount }} 个总结加入书签库</span>
                            </div>
                          </button>
                        </div>
                      </Transition>
                    </div>
                  </template>

                  <!-- 清空全部输入框 -->
                  <button
                    type="button"
                    class="btn-secondary btn-sm batch-action-btn btn-clear-all"
                    title="清空所有输入框"
                    @click="handleClearAllRows"
                  >
                    <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.trash"></svg>
                    <span>清空全部</span>
                  </button>
                </div>
              </div>
            </Transition>

            <!-- 2. 中间：连接在一起的输入框列表 (带丝滑平滑动效) -->
            <TransitionGroup name="row-fade" tag="div" class="connected-inputs-list">
              <div
                v-for="(row, idx) in inputRows"
                :key="row.id"
                class="connected-input-row-block"
              >
                <!-- 每一个方框输入行 -->
                <div class="connected-input-row">
                  <div class="url-input-inner">
                    <div class="input-prefix-icon">
                      <svg class="svg-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.link"></svg>
                    </div>

                    <input
                      v-model="row.url"
                      type="text"
                      class="url-field"
                      :placeholder="inputPlaceholder"
                      :disabled="row.isGenerating || row.isTyping || row.isQueued"
                      autocomplete="off"
                      spellcheck="false"
                      @keydown.enter.prevent="handleStartRowSummary(row)"
                    />

                    <!-- 叉号取消/清空按钮 (黑白配色) -->
                    <button
                      v-if="row.url || row.isGenerating || row.isTyping || row.isQueued || row.result"
                      type="button"
                      class="clear-input-btn"
                      :class="{ 'is-cancelling-btn': row.isGenerating || row.isTyping || row.isQueued }"
                      :title="row.isGenerating || row.isTyping || row.isQueued ? '点击取消生成总结' : '清空输入框'"
                      @click="handleCancelOrClearRow(row)"
                    >
                      <svg class="svg-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.close"></svg>
                    </button>

                    <!-- 删除该方框按钮 -->
                    <button
                      v-if="inputRows.length > 1"
                      type="button"
                      class="remove-card-btn"
                      title="删除此输入框"
                      :disabled="row.isGenerating || row.isTyping || row.isQueued"
                      @click="removeInputRow(idx)"
                    >
                      <svg class="svg-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.trash"></svg>
                    </button>
                  </div>

                  <!-- 每一个方框右侧的操作按钮组：生成快照 + 生成总结 -->
                  <div class="row-actions-group">
                    <!-- 生成快照按钮 (水墨辅助黑白按钮) -->
                    <button
                      type="button"
                      class="btn-secondary snapshot-action-btn"
                      :disabled="!row.url.trim() || row.isGenerating || row.isTyping || row.isQueued || row.isGeneratingSnapshot"
                      :title="row.isGeneratingSnapshot ? '正在抓取并保存离线快照...' : '一键生成并保存该网页的离线图文快照'"
                      @click="handleStartRowSnapshot(row)"
                    >
                      <span v-if="row.isGeneratingSnapshot" class="spinner-icon dark-spinner"></span>
                      <svg v-else class="svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.camera"></svg>
                      <span>{{ row.isGeneratingSnapshot ? '快照中...' : '生成快照' }}</span>
                    </button>

                    <!-- 生成总结按钮 (黑白胶囊按钮) -->
                    <button
                      type="button"
                      class="btn-primary submit-action-btn"
                      :class="{ 'btn-is-queued': row.isQueued }"
                      :disabled="!row.url.trim() || row.isGenerating || row.isTyping || row.isQueued || row.isGeneratingSnapshot"
                      :title="row.isQueued ? '当前已有 5 个任务并发进行，正在排队中...' : '一键生成 AI 智能总结'"
                      @click="handleStartRowSummary(row)"
                    >
                      <span v-if="row.isGenerating || row.isTyping" class="spinner-icon"></span>
                      <span v-if="row.isQueued" class="btn-inline-icon-text">
                        <svg class="svg-icon spin-slow" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.refresh"></svg>
                        <span>排队等待中...</span>
                      </span>
                      <span v-else-if="row.isGenerating">正在深度提炼中...</span>
                      <span v-else-if="row.isTyping">正在生成输出中...</span>
                      <span v-else>生成总结</span>
                    </button>
                  </div>
                </div>

                <!-- 独立错误提示横幅 (纯黑白风格，无前置圆圈图标) -->
                <Transition name="result-fade">
                  <div v-if="row.errorMessage" class="error-banner">
                    <span class="err-text">{{ row.errorMessage }}</span>
                    <button class="btn-flat btn-sm" @click="row.errorMessage = ''">
                      <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.close"></svg>
                    </button>
                  </div>
                </Transition>

                <!-- 独立结果卡片：紧贴在该方框正下方展开 (带平滑展开与显隐动画) -->
                <Transition name="result-fade">
                  <div
                    v-if="row.result || row.isTyping"
                    class="result-card unit-result-card"
                    :class="{ 'is-collapsed-card': row.isCollapsed && !row.isTyping }"
                  >
                    <div class="result-header">
                    <div class="result-brand-info">
                      <span class="generating-status" :class="{ 'is-active': row.isTyping }">
                        <span class="status-pulse-dot"></span>
                        <span>{{ row.isTyping ? 'AI 正在实时输出中...' : (row.isEditing ? '正在编辑总结' : '总结已生成') }}</span>
                      </span>
                      <span class="result-time">{{ formatDisplayTime(row.result?.timestamp) }}</span>
                    </div>

                    <div class="result-actions-wrapper">
                      <div v-if="!row.isTyping" class="action-buttons-group">
                        <button
                          type="button"
                          class="btn-secondary btn-sm action-btn toggle-collapse-btn"
                          :title="row.isCollapsed ? '展开完整总结' : '折叠收起总结'"
                          @click="row.isCollapsed = !row.isCollapsed"
                        >
                          <span>{{ row.isCollapsed ? '展开总结 ▼' : '折叠总结 ▲' }}</span>
                        </button>

                        <div v-if="!row.isCollapsed" class="unit-action-subgroup">
                          <button
                            v-if="!row.isEditing"
                            class="btn-secondary btn-sm action-btn"
                            title="在首页直接编辑此总结"
                            @click="startEditRowSummary(row)"
                          >
                            <svg class="svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.edit"></svg>
                            <span>编辑总结</span>
                          </button>
                          <button
                            v-else
                            class="btn-primary btn-sm action-btn"
                            title="完成并保存编辑"
                            @click="finishEditRowSummary(row)"
                          >
                            <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.check"></svg>
                            <span>完成编辑</span>
                          </button>

                          <button
                            v-if="!row.isEditing"
                            class="btn-sm action-btn"
                            :class="row.saved ? 'btn-success' : 'btn-primary'"
                            :title="row.saved ? (row.saveToastText || '已完成保存') : (isRowInBookmarks(row) ? '该网址已在书签库中，点击覆盖旧书签' : '将当前总结与网址保存为书签')"
                            @click="handleSaveRowToBookmark(row)"
                          >
                            <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="row.saved ? ICONS.check : (isRowInBookmarks(row) ? ICONS.refresh : ICONS.bookmark)"></svg>
                            <span>{{ row.saved ? (row.saveToastText || (isRowInBookmarks(row) ? '已覆盖旧书签' : '已保存至书签')) : (isRowInBookmarks(row) ? '覆盖旧书签' : '保存到书签') }}</span>
                          </button>

                          <button
                            v-if="!row.isEditing"
                            class="btn-secondary btn-sm action-btn"
                            title="复制总结内容"
                            @click="copyRowSummary(row)"
                          >
                            <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="row.copied ? ICONS.check : ICONS.copy"></svg>
                            <span>{{ row.copied ? '已复制' : '复制内容' }}</span>
                          </button>
                        </div>
                      </div>

                      <button class="btn-flat btn-sm btn-close-card" title="关闭并清除此结果" @click="handleCloseRowResult(row)">
                        <svg class="svg-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.close"></svg>
                      </button>
                    </div>
                  </div>

                  <div class="result-title-and-url-section">
                    <div class="result-title-badge-row">
                      <span v-if="row.folder" class="home-folder-chip" :title="`所属浏览器分类：${row.folder}`">
                        <svg class="svg-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.folder"></svg>
                        <span>{{ row.folder }}</span>
                      </span>
                      <h2 class="result-display-title">{{ row.result?.title || row.url }}</h2>
                    </div>
                    <a :href="row.result?.url || row.url" target="_blank" rel="noopener noreferrer" class="result-display-url" title="点击访问原网页">
                      <span>{{ row.result?.url || row.url }}</span>
                      <svg class="svg-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.external"></svg>
                    </a>
                  </div>

                  <template v-if="!row.isCollapsed || row.isTyping">
                    <div v-if="row.isEditing" class="homepage-edit-box">
                      <textarea
                        v-model="row.editableSummaryText"
                        class="homepage-summary-textarea"
                        rows="11"
                        placeholder="在此直接修改总结内容 (支持 Markdown 格式)..."
                      ></textarea>
                      <div class="homepage-edit-footer">
                        <button class="btn-secondary btn-sm" @click="cancelEditRowSummary(row)">取消修改</button>
                        <button class="btn-primary btn-sm" @click="finishEditRowSummary(row)">
                          <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.check"></svg>
                          <span>保存修改</span>
                        </button>
                      </div>
                    </div>

                    <div v-else class="result-markdown-body">
                      <div v-html="formatMdToHtml(row.isTyping ? row.streamedText : (row.result?.detailedSummary || row.streamedText || ''))"></div>
                      <span v-if="row.isTyping" class="typing-cursor">▌</span>
                    </div>
                  </template>
                </div>
              </Transition>
            </div>
          </TransitionGroup>

            <!-- 3. 底部操作栏：直接与上面大方框连在一起 (两个独立小按钮) -->
            <div class="unified-card-footer-bar">
              <button
                type="button"
                class="btn-footer-action"
                @click="addNewInputRow"
              >
                <span>点击新增一个独立输入框</span>
              </button>

              <button
                type="button"
                class="btn-footer-action"
                title="一键读取浏览器书签或导入书签文件"
                @click="showExtensionModal = true"
              >
                <span>一键导入浏览器书签</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 浏览器小书签 (Bookmarklet) 弹窗 -->
    <BookmarkletModal v-model="showBookmarkletModal" />

    <!-- 浏览器书签插件智能导入与安装弹窗 -->
    <ExtensionInstallModal
      v-model="showExtensionModal"
      @import-bookmarks="handleImportBookmarksFromExt"
    />

    <!-- 系统自动检测与在线升级弹窗 -->
    <UpdateModal />

    <!-- 首页全局提示 (快照生成成功提示) -->
    <Transition name="toast-fade">
      <div v-if="homepageToast" class="homepage-toast-notification">
        <svg class="svg-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.check"></svg>
        <span>{{ homepageToast }}</span>
        <NuxtLink v-if="lastSnapshotId" :to="`/snapshot/${lastSnapshotId}`" class="toast-view-link" title="点击查看刚生成的网页快照">
          <span>立即查看</span>
          <svg class="svg-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="ICONS.external"></svg>
        </NuxtLink>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, onActivated } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth, useBookmarks, useSnapshots, useTheme, ICONS, getAuthHeaders, type SnapshotItem } from './state'
import { useUpdater } from '../utils/updater'
import BookmarkletModal from '../components/BookmarkletModal.vue'
import ExtensionInstallModal from '../components/ExtensionInstallModal.vue'
import UpdateModal from '../components/UpdateModal.vue'

definePageMeta({
  keepalive: true
})

const router = useRouter()
const route = useRoute()
const { logout } = useAuth()
const { addBookmark, bookmarks } = useBookmarks()
const { addSnapshot } = useSnapshots()
const { themeMode, cycleTheme } = useTheme()
const { versionInfo, openUpdateModal, checkUpdateSilently } = useUpdater()

onMounted(() => {
  checkUpdateSilently()
})

onActivated(() => {
  checkAndExecuteUrlQuery()
})

// ==========================================
// 状态管理
// ==========================================
export interface InputRowItem {
  id: string
  url: string
  title?: string
  folder?: string
  isQueued: boolean
  isGenerating: boolean
  isTyping: boolean
  isGeneratingSnapshot?: boolean
  streamedText: string
  errorMessage: string
  isEditing?: boolean
  editableSummaryText?: string
  saved?: boolean
  saveToastText?: string
  copied?: boolean
  isCollapsed?: boolean
  abortController?: AbortController | null
  result?: {
    title: string
    url: string
    detailedSummary: string
    tags: string[]
    timestamp: string
  }
}

// 独立的输入框列表，默认 1 个独立方框
const inputRows = ref<InputRowItem[]>([
  {
    id: '1',
    url: '',
    isQueued: false,
    isGenerating: false,
    isTyping: false,
    streamedText: '',
    errorMessage: '',
    isEditing: false,
    saved: false,
    copied: false,
    isCollapsed: false,
    abortController: null
  }
])

const showBookmarkletModal = ref(false)
const showExtensionModal = ref(false)
const showBatchDropdown = ref(false)

// 规范化 URL 判定工具
const normUrl = (u: string) => {
  if (!u) return ''
  try {
    const parsed = new URL(u.startsWith('http') ? u.trim() : 'https://' + u.trim())
    let pathname = parsed.pathname
    if (pathname === '/') pathname = ''
    else pathname = pathname.replace(/\/+$/, '')
    return (parsed.hostname.toLowerCase() + pathname + (parsed.search ? parsed.search.toLowerCase() : '')).toLowerCase()
  } catch {
    return u.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '').toLowerCase()
  }
}

// 判断某个总结项的网址是否已保存在当前书签库中
const isRowInBookmarks = (row: InputRowItem) => {
  const targetUrl = row.result?.url || row.url
  if (!targetUrl || !targetUrl.trim()) return false
  const targetNorm = normUrl(targetUrl)
  return bookmarks.value.some(b => normUrl(b.url) === targetNorm)
}

const currentTimeStr = ref(new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false }))
const formatDisplayTime = (ts?: string | number | Date) => {
  if (!ts) {
    return new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  if (typeof ts === 'string' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(ts.trim())) {
    return ts.trim()
  }
  const d = new Date(ts)
  if (isNaN(d.getTime())) return String(ts)
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
}
const inputPlaceholder = ref('输入或粘贴网页链接 (例如: juejin.cn 或 github.com)...')

// ==========================================
// 严格 5 并发总结流水线调度器 (单点或批量均受控)
// ==========================================
const MAX_CONCURRENT = 5
const activeConcurrentCount = ref(0)
const summaryQueue: Array<{ row: InputRowItem; initialTitle?: string }> = []

const processNextInQueue = () => {
  while (activeConcurrentCount.value < MAX_CONCURRENT && summaryQueue.length > 0) {
    const nextItem = summaryQueue.shift()
    if (nextItem && nextItem.row && !nextItem.row.result) {
      executeRowSummary(nextItem.row, nextItem.initialTitle)
    }
  }
}

// 书签批量导入处理：从书签中勾选导入时不覆盖已有网址，一律新增并完整保留所属文件夹分类
const handleImportBookmarksFromExt = (items: Array<{ url: string; title: string; folder?: string }>) => {
  if (!items.length) return

  const norm = (u: string) => u.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '').toLowerCase()

  // 1. 收集当前所有已存在的网址 (包括正在总结、排队中、待总结和已完成的)
  const existingNorms = new Set<string>()
  for (const r of inputRows.value) {
    const rNorm = norm(r.url)
    if (rNorm) existingNorms.add(rNorm)
  }

  // 2. 过滤待导入项：排除自身重复项以及当前已有相同网址
  const newItemsToAdd: Array<{ url: string; title: string; folder?: string }> = []
  let duplicateCount = 0

  for (const it of items) {
    const itNorm = norm(it.url)
    if (!itNorm) continue
    if (existingNorms.has(itNorm)) {
      duplicateCount++
    } else {
      existingNorms.add(itNorm)
      newItemsToAdd.push(it)
    }
  }

  // 若导入的内容全部为已存在的重复网址
  if (duplicateCount > 0 && newItemsToAdd.length === 0) {
    const targetRow = inputRows.value[inputRows.value.length - 1] || inputRows.value[0]
    if (targetRow) {
      setRowError(targetRow, `所选 ${duplicateCount} 个网址已在列表中，已自动跳过重复项`)
    }
    return
  }

  // 3. 若当前仅有 1 个完全空白且未开始的占位方框，可放入首条
  let startIdx = 0
  if (
    inputRows.value.length === 1 &&
    !inputRows.value[0].url.trim() &&
    !inputRows.value[0].isGenerating &&
    !inputRows.value[0].isTyping &&
    !inputRows.value[0].isQueued &&
    !inputRows.value[0].result
  ) {
    inputRows.value[0].url = newItemsToAdd[0].url
    inputRows.value[0].title = newItemsToAdd[0].title
    inputRows.value[0].folder = newItemsToAdd[0].folder
    inputRows.value[0].errorMessage = ''
    startIdx = 1
  }

  // 4. 其余书签全部以「新增独立输入框」形式追加，绝不覆盖已有网址
  for (let i = startIdx; i < newItemsToAdd.length; i++) {
    const it = newItemsToAdd[i]
    inputRows.value.push({
      id: Math.random().toString(36).substring(2, 9),
      url: it.url,
      title: it.title,
      folder: it.folder,
      isQueued: false,
      isGenerating: false,
      isTyping: false,
      streamedText: '',
      errorMessage: '',
      isEditing: false,
      saved: false,
      copied: false,
      isCollapsed: true,
      abortController: null
    })
  }

  // 若部分网址重复，在末尾方框给出明确提示
  if (duplicateCount > 0) {
    const targetRow = inputRows.value[inputRows.value.length - 1]
    if (targetRow) {
      setRowError(targetRow, `已成功导入 ${newItemsToAdd.length} 个新网址，已自动跳过 ${duplicateCount} 个重复网址`)
    }
  }
}

const completedCount = computed(() => inputRows.value.filter(r => !!r.result).length)
const queuedCount = computed(() => inputRows.value.filter(r => r.isQueued).length)
const inProgressCount = computed(() => inputRows.value.filter(r => r.isGenerating || r.isTyping).length)
const pendingCount = computed(() => inputRows.value.filter(r => !r.result && !r.isGenerating && !r.isTyping && !r.isQueued && r.url.trim()).length)
const unsavedCompletedCount = computed(() => inputRows.value.filter(r => !!r.result && !r.saved).length)

// 已完成未保存项中，有多少个已存在于书签库中
const completedInBookmarksCount = computed(() => {
  return inputRows.value.filter(r => !!r.result && !r.saved && isRowInBookmarks(r)).length
})

// 是否存在至少 1 个已在书签库中的总结结果
const hasCompletedInBookmarks = computed(() => completedInBookmarksCount.value > 0)

// 一键全部开始总结：将所有待总结的任务按 5 并发流水线批量启动
const handleStartBatchAll = () => {
  const pendingRows = inputRows.value.filter(r => !r.result && !r.isGenerating && !r.isTyping && !r.isQueued && r.url.trim())
  if (!pendingRows.length) return
  for (const row of pendingRows) {
    handleStartRowSummary(row)
  }
}

// 一键取消所有正在运行与排队中的总结任务
const handleCancelBatchAll = () => {
  summaryQueue.length = 0
  for (const row of inputRows.value) {
    if (row.abortController) {
      row.abortController.abort()
      row.abortController = null
    }
    if (row.isGenerating || row.isTyping || row.isQueued) {
      row.isGenerating = false
      row.isTyping = false
      row.isQueued = false
      row.streamedText = ''
      row.errorMessage = ''
    }
  }
  activeConcurrentCount.value = 0
}

// 一键全部保存到书签
const handleBatchSaveAllToBookmarks = async () => {
  showBatchDropdown.value = false
  const completedUnsaved = inputRows.value.filter(r => !!r.result && !r.saved)
  if (!completedUnsaved.length) return
  for (const row of completedUnsaved) {
    if (row.result) {
      const wasIn = isRowInBookmarks(row)
      await addBookmark({
        title: row.result.title,
        url: row.result.url,
        summary: row.result.detailedSummary,
        tags: row.result.tags,
        description: row.result.title,
        folder: row.folder ? row.folder.trim() : undefined,
        icon: 'bookmark',
        color: '#0f172a'
      })
      row.saved = true
      row.saveToastText = wasIn ? '已覆盖旧书签' : '已保存'
    }
  }
}

// 批量覆盖相同书签：覆盖更新已存在的书签，同时将新书签加入
const handleBatchOverwriteBookmarks = async () => {
  showBatchDropdown.value = false
  const completedUnsaved = inputRows.value.filter(r => !!r.result && !r.saved)
  if (!completedUnsaved.length) return
  for (const row of completedUnsaved) {
    if (row.result) {
      const wasIn = isRowInBookmarks(row)
      await addBookmark({
        title: row.result.title,
        url: row.result.url,
        summary: row.result.detailedSummary,
        tags: row.result.tags,
        description: row.result.title,
        folder: row.folder ? row.folder.trim() : undefined,
        icon: 'bookmark',
        color: '#0f172a'
      })
      row.saved = true
      row.saveToastText = wasIn ? '已覆盖旧书签' : '已保存'
    }
  }
}

// 清空所有输入框
const handleClearAllRows = () => {
  summaryQueue.length = 0
  for (const row of inputRows.value) {
    if (row.abortController) {
      row.abortController.abort()
      row.abortController = null
    }
  }
  activeConcurrentCount.value = 0
  inputRows.value = [{
    id: '1',
    url: '',
    isQueued: false,
    isGenerating: false,
    isTyping: false,
    streamedText: '',
    errorMessage: '',
    isEditing: false,
    saved: false,
    copied: false,
    isCollapsed: false,
    abortController: null
  }]
}

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

let mql: MediaQueryList | null = null
const updatePlaceholder = () => {
  if (typeof window !== 'undefined') {
    if (window.innerWidth <= 640 || (mql && mql.matches)) {
      inputPlaceholder.value = '输入或粘贴网页链接'
    } else {
      inputPlaceholder.value = '输入或粘贴网页链接 (例如: juejin.cn 或 github.com)...'
    }
  }
}

const handleLogout = async () => {
  await logout()
  window.location.href = '/login'
}

// ==========================================
// 小书签与 URL Query 传参自动响应
// ==========================================
const checkAndExecuteUrlQuery = async () => {
  if (route.query.import_extension === '1' || route.query.import === 'bookmarks') {
    showExtensionModal.value = true
    return
  }

  const queryUrl = (route.query.url || route.query.target || route.query.link) as string
  const queryTitle = (route.query.title || '') as string
  if (queryUrl && typeof queryUrl === 'string') {
    let decoded = queryUrl.trim()
    try {
      decoded = decodeURIComponent(decoded)
    } catch {}
    if (decoded) {
      inputRows.value = [{
        id: '1',
        url: decoded,
        isQueued: false,
        isGenerating: false,
        isTyping: false,
        streamedText: '',
        errorMessage: '',
        isEditing: false,
        saved: false,
        copied: false,
        isCollapsed: false,
        abortController: null
      }]
      const shouldAuto = route.query.auto === '1' || route.query.auto === 'true' || route.query.auto === undefined
      if (shouldAuto) {
        await nextTick()
        handleStartRowSummary(inputRows.value[0], queryTitle ? decodeURIComponent(queryTitle) : undefined)
      }
    }
  }
}

const closeDropdown = () => {
  showBatchDropdown.value = false
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    mql = window.matchMedia('(max-width: 640px)')
    updatePlaceholder()
    window.addEventListener('resize', updatePlaceholder)
    window.addEventListener('click', closeDropdown)

    checkAndExecuteUrlQuery()
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updatePlaceholder)
    window.removeEventListener('click', closeDropdown)
  }
})

// ==========================================
// 独立输入框增删与提炼逻辑
// ==========================================
const addNewInputRow = () => {
  inputRows.value.push({
    id: Math.random().toString(36).substring(2, 9),
    url: '',
    isQueued: false,
    isGenerating: false,
    isTyping: false,
    streamedText: '',
    errorMessage: '',
    isEditing: false,
    saved: false,
    copied: false,
    isCollapsed: true,
    abortController: null
  })
}

const removeInputRow = (index: number) => {
  const row = inputRows.value[index]
  if (row?.abortController) {
    row.abortController.abort()
  }
  if (row?.isQueued) {
    const qIdx = summaryQueue.findIndex(item => item.row.id === row.id)
    if (qIdx !== -1) summaryQueue.splice(qIdx, 1)
  }
  if (inputRows.value.length === 1) {
    inputRows.value[0].url = ''
    inputRows.value[0].result = undefined
    inputRows.value[0].streamedText = ''
    inputRows.value[0].errorMessage = ''
    inputRows.value[0].isCollapsed = false
    inputRows.value[0].isQueued = false
    return
  }
  inputRows.value.splice(index, 1)
  // 如果删除后只剩 1 个输入框，自动展开
  if (inputRows.value.length === 1) {
    inputRows.value[0].isCollapsed = false
  }
}

// 叉号按钮处理：若正在生成或排队则取消，平时点击则清空
const handleCancelOrClearRow = (row: InputRowItem) => {
  if (row.isQueued) {
    row.isQueued = false
    const qIdx = summaryQueue.findIndex(item => item.row.id === row.id)
    if (qIdx !== -1) summaryQueue.splice(qIdx, 1)
    return
  }
  if (row.isGenerating || row.isTyping) {
    if (row.abortController) {
      row.abortController.abort()
      row.abortController = null
    }
    row.isGenerating = false
    row.isTyping = false
    row.streamedText = ''
    row.result = undefined
    row.errorMessage = ''
    return
  }
  row.url = ''
  row.result = undefined
  row.streamedText = ''
  row.errorMessage = ''
}

// 网址有效性校验 (仅支持合法的公网 Web 网址)
const isValidPublicUrl = (input: string): boolean => {
  let toTest = input.trim()
  if (!toTest) return false
  if (!/^https?:\/\//i.test(toTest)) {
    toTest = 'https://' + toTest
  }
  try {
    const parsed = new URL(toTest)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
    const host = parsed.hostname
    if (!host || !host.includes('.') || host.startsWith('.') || host.endsWith('.')) return false
    if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.')) {
      return false
    }
    const parts = host.split('.')
    const tld = parts[parts.length - 1]
    if (!tld || !/^[a-zA-Z]{2,}$/.test(tld)) return false
    return true
  } catch {
    return false
  }
}

// 设置错误提示并在 5 秒后自动关闭
const setRowError = (row: InputRowItem, msg: string) => {
  row.errorMessage = msg
  if ((row as any)._errTimer) {
    clearTimeout((row as any)._errTimer)
  }
  (row as any)._errTimer = setTimeout(() => {
    if (row.errorMessage === msg) {
      row.errorMessage = ''
    }
  }, 5000)
}

// 首页全局微提示
const homepageToast = ref('')
const lastSnapshotId = ref('')
const showHomepageToast = (msg: string, snapshotId?: string) => {
  homepageToast.value = msg
  lastSnapshotId.value = snapshotId || ''
  setTimeout(() => {
    if (homepageToast.value === msg) {
      homepageToast.value = ''
      lastSnapshotId.value = ''
    }
  }, 4000)
}

// 启动网页快照生成 (支持在首页直接输入链接生成离线图文快照，失败提示小书签并在同位置停留5秒自动消失)
const handleStartRowSnapshot = async (row: InputRowItem) => {
  const targetUrl = row.url.trim()
  if (!targetUrl || row.isGenerating || row.isTyping || row.isQueued || row.isGeneratingSnapshot) return

  // 1. 严格网址有效性校验
  if (!isValidPublicUrl(targetUrl)) {
    setRowError(row, '请输入合法的有效公网网址 (例如: juejin.cn 或 github.com)')
    return
  }

  row.isGeneratingSnapshot = true
  row.errorMessage = ''

  try {
    const res = await $fetch<{ success: boolean; snapshot: SnapshotItem }>('/api/snapshot', {
      method: 'POST',
      body: { url: targetUrl }
    })

    if (res && res.success && res.snapshot) {
      await addSnapshot(res.snapshot)
      showHomepageToast('🎉 网页快照生成成功，已存入快照库！', res.snapshot.id)
    } else {
      setRowError(row, '快照生成失败（目标网站可能存在防爬限制或网络超时），建议使用左上角「小书签」在当前网页一键快照保存')
    }
  } catch (err: any) {
    setRowError(row, '快照生成失败（目标网站可能存在防爬限制或网络超时），建议使用左上角「小书签」在当前网页一键快照保存')
  } finally {
    row.isGeneratingSnapshot = false
  }
}

// 启动总结（严格网址校验 + 受控并发 + 防重复总结相同网址）
const handleStartRowSummary = (row: InputRowItem, initialTitle?: string) => {
  const targetUrl = row.url.trim()
  if (!targetUrl || row.isGenerating || row.isTyping || row.isQueued) return

  // 1. 严格网址有效性校验：无效网址严格拦截不输出总结
  if (!isValidPublicUrl(targetUrl)) {
    setRowError(row, '请输入合法的有效公网网址 (例如: juejin.cn 或 github.com)')
    row.result = undefined
    row.streamedText = ''
    return
  }

  const norm = (u: string) => u.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '').toLowerCase()
  const targetNorm = norm(targetUrl)

  // 2. 校验：不能同时总结两个相同的网址
  const duplicateRunning = inputRows.value.find(
    (r) => r.id !== row.id && norm(r.url) === targetNorm && (r.isGenerating || r.isTyping || r.isQueued)
  )
  if (duplicateRunning) {
    setRowError(row, '该网址已在总结或排队中，不能同时重复总结')
    return
  }

  const duplicateCompleted = inputRows.value.find(
    (r) => r.id !== row.id && norm(r.url) === targetNorm && !!r.result
  )
  if (duplicateCompleted) {
    setRowError(row, '该网址已在下方生成过总结，无需重复总结')
    return
  }

  // 3. 若当前进行中的任务已达到 5 个，进入排队队列
  if (activeConcurrentCount.value >= MAX_CONCURRENT) {
    row.isQueued = true
    row.errorMessage = ''
    summaryQueue.push({ row, initialTitle })
    return
  }

  executeRowSummary(row, initialTitle)
}

const executeRowSummary = async (row: InputRowItem, initialTitle?: string) => {
  row.isQueued = false
  if (row.abortController) {
    row.abortController.abort()
  }
  const controller = new AbortController()
  row.abortController = controller

  activeConcurrentCount.value++
  row.errorMessage = ''
  row.isGenerating = true
  row.isTyping = false
  row.streamedText = ''
  row.result = undefined
  row.isEditing = false
  row.saved = false
  // 单个总结不折叠，多个总结默认折叠
  row.isCollapsed = inputRows.value.length > 1

  try {
    const raw = /^https?:\/\//i.test(row.url.trim()) ? row.url.trim() : 'https://' + row.url.trim()
    const headers = getAuthHeaders()

    const data = await $fetch<{
      success: boolean
      title: string
      url: string
      detailedSummary: string
      tags?: string[]
      timestamp?: string
    }>('/api/summarize', {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: {
        url: raw,
        title: initialTitle || row.title
      }
    })

    if (controller.signal.aborted) return

    if (data && (data.success || data.detailedSummary)) {
      row.isGenerating = false
      row.isTyping = true

      const fullText = data.detailedSummary || ''
      let cur = ''
      for (let i = 0; i < fullText.length; i++) {
        if (controller.signal.aborted) return
        cur += fullText[i]
        row.streamedText = cur
        if (i % 8 === 0) {
          await new Promise((r) => setTimeout(r, 12))
        }
      }

      row.result = {
        title: data.title || raw,
        url: data.url || raw,
        detailedSummary: fullText,
        tags: data.tags || [],
        timestamp: data.timestamp || new Date().toISOString()
      }
    } else {
      setRowError(row, '总结生成失败，请检查网络或链接')
    }
  } catch (err: any) {
    if (err?.name === 'AbortError' || controller.signal.aborted) {
      return
    }
    const errMsg = err?.data?.statusMessage || err?.data?.message || err?.message || '总结生成失败，请检查网络或链接'
    setRowError(row, errMsg)
  } finally {
    row.isGenerating = false
    row.isTyping = false
    row.abortController = null
    activeConcurrentCount.value = Math.max(0, activeConcurrentCount.value - 1)
    processNextInQueue()
  }
}

const handleCloseRowResult = (row: InputRowItem) => {
  row.result = undefined
  row.streamedText = ''
  row.isEditing = false
  row.isTyping = false
  row.isGenerating = false
  row.isQueued = false
}

const startEditRowSummary = (row: InputRowItem) => {
  row.editableSummaryText = row.result?.detailedSummary || row.streamedText || ''
  row.isEditing = true
}

const cancelEditRowSummary = (row: InputRowItem) => {
  row.isEditing = false
}

const finishEditRowSummary = (row: InputRowItem) => {
  if (row.result && row.editableSummaryText) {
    row.result.detailedSummary = row.editableSummaryText.trim()
  }
  if (row.editableSummaryText) {
    row.streamedText = row.editableSummaryText.trim()
  }
  row.isEditing = false
}

const handleSaveRowToBookmark = async (row: InputRowItem) => {
  if (!row.result) return
  const wasAlreadyInBookmarks = isRowInBookmarks(row)
  const folderName = row.folder ? row.folder.trim() : undefined
  const saveRes = await addBookmark({
    title: row.result.title,
    url: row.result.url,
    summary: row.result.detailedSummary,
    tags: row.result.tags,
    description: row.result.title,
    folder: folderName,
    icon: 'bookmark',
    color: '#0f172a'
  })
  const isUpdate = saveRes?.isUpdate || wasAlreadyInBookmarks
  row.saveToastText = isUpdate ? '已覆盖旧书签' : (folderName ? `已保存至 [${folderName}]` : '已保存至书签')
  row.saved = true
  setTimeout(() => {
    row.saved = false
  }, 4000)
}

const copyRowSummary = async (row: InputRowItem) => {
  const content = row.result?.detailedSummary || row.streamedText
  if (!content) return
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(content)
      row.copied = true
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = content
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      textarea.style.top = '-9999px'
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      const successful = document.execCommand('copy')
      document.body.removeChild(textarea)
      if (successful) row.copied = true
    }
    setTimeout(() => { row.copied = false }, 2000)
  } catch (e) {
    console.error('Failed to copy', e)
  }
}

// ==========================================
// Markdown 渲染格式化
// ==========================================
const formatMdToHtml = (textSource: string) => {
  if (!textSource) return ''
  let text = textSource
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  text = text.replace(/^#\s+(.+)$/gm, '<h2 class="md-main-title">$1</h2>')
  text = text.replace(/^###\s+(.+)$/gm, '<h3 class="md-section-title">$1</h3>')
  text = text.replace(/^---$/gm, '<hr class="md-divider" />')
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  text = text.replace(/^\*\s+\[\s*\]\s+(.+)$/gm, '<div class="md-todo-row"><span class="todo-box">[ ]</span><span class="todo-text">$1</span></div>')
  text = text.replace(/^[\*•\-]\s+(.+)$/gm, '<div class="md-bullet-row"><span class="bullet-dot">•</span><span class="bullet-text">$1</span></div>')
  text = text.replace(/\n\n/g, '<div class="md-gap"></div>')
  text = text.replace(/\n/g, '<br/>')
  return text
}
</script>

<style scoped>
.homepage-layout {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-app);
  color: var(--text-main);
  position: relative;
}

.top-left-floating-bar {
  position: fixed;
  top: 1rem;
  left: 1.25rem;
  z-index: 99;
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.top-right-floating-bar {
  position: fixed;
  top: 1rem;
  right: 1.25rem;
  z-index: 99;
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.nav-logout-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.38rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-muted);
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  backdrop-filter: blur(8px);
}
.nav-logout-btn:hover {
  color: var(--text-main);
  border-color: var(--border-strong);
  background-color: var(--bg-surface-hover);
}

.nav-bookmarklet-btn {
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
  transition: all 0.15s ease;
}
.nav-bookmarklet-btn:hover {
  border-color: var(--text-main);
  background-color: var(--bg-surface-hover);
  color: var(--text-main);
}

.nav-update-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.38rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-muted);
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: all 0.15s ease;
}

.nav-update-btn:hover {
  color: var(--text-main);
  border-color: var(--border-strong);
  background-color: var(--bg-surface-hover);
}

.nav-update-btn.has-new-update {
  border-color: rgba(59, 130, 246, 0.4);
  color: var(--primary);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, var(--bg-surface) 100%);
}

.update-pulse-dot {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: #ef4444;
  box-shadow: 0 0 0 2px var(--bg-surface);
  animation: pulseDot 1.8s infinite;
}

@keyframes pulseDot {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 5px rgba(239, 68, 68, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}

.theme-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
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
  background-color: var(--bg-surface-hover);
}

.nav-switch-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.38rem 0.85rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--primary-contrast) !important;
  background-color: var(--primary);
  border: 1px solid var(--primary);
  border-radius: var(--radius-full);
  text-decoration: none;
  box-shadow: var(--shadow-sm);
}
.nav-switch-btn:hover {
  background-color: var(--primary-hover);
}

/* 首页主体排布 */
.homepage-main {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: clamp(2.5rem, 9vh, 5.5rem);
  padding-bottom: 3rem;
  padding-left: 1.5rem;
  padding-right: 1.5rem;
}

.summarizer-wrapper {
  width: 100%;
  max-width: 840px;
}

.summarizer-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.hero-intro-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 0.5rem 1rem;
  gap: 0.875rem;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.85rem;
  background-color: var(--bg-surface);
  color: var(--text-main);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
  font-size: 0.8125rem;
  font-weight: 600;
  box-shadow: var(--shadow-xs);
}

.hero-title {
  font-size: 2.25rem;
  font-weight: 800;
  color: var(--text-main);
  margin: 0;
  letter-spacing: -0.03em;
  line-height: 1.25;
}

.hero-description {
  font-size: 1.0625rem;
  color: var(--text-muted);
  max-width: 100%;
  margin: 0;
  line-height: 1.6;
}

.feature-highlights-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 0.25rem;
}

.highlight-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.75rem;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  color: var(--text-muted);
  box-shadow: var(--shadow-xs);
}

/* 连在一起的核心卡片大方框 (顶部控制台 + 中间所有方框 + 底部操作栏一体化) */
.main-unified-card {
  display: flex;
  flex-direction: column;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.main-unified-card .batch-control-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background-color: var(--bg-surface-subtle);
  border-bottom: 1px solid var(--border-subtle);
  flex-wrap: wrap;
}

.batch-summary-stats {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.stat-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.55rem;
  border-radius: var(--radius-full);
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
}

.stat-badge.is-success {
  background-color: var(--bg-surface);
  color: var(--text-main);
  border-color: var(--text-main);
}

.stat-badge.is-running {
  background-color: var(--bg-surface);
  color: var(--text-main);
  border-color: var(--text-main);
  animation: pulse 1.5s infinite;
}

.stat-badge.is-queued {
  background-color: var(--bg-surface-subtle);
  color: var(--text-main);
  border-color: var(--border-strong);
}

.stat-badge.is-pending {
  color: var(--text-subtle);
}

.batch-actions-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.batch-action-btn {
  font-size: 0.8125rem;
  padding: 0.4rem 0.85rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.batch-dropdown-container {
  position: relative;
  display: inline-flex;
}

.batch-dropdown-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
}

.dropdown-arrow {
  transition: transform 0.2s ease;
  margin-left: 0.15rem;
}

.batch-dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 120;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  padding: 0.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 260px;
  backdrop-filter: blur(12px);
}

.dropdown-menu-item {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.55rem 0.75rem;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-main);
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
  width: 100%;
  box-sizing: border-box;
}

.dropdown-menu-item:hover {
  background-color: var(--bg-surface-hover);
  border-color: var(--border-subtle);
}

.menu-item-icon {
  margin-top: 0.15rem;
  flex-shrink: 0;
  color: var(--text-main);
}

.menu-item-text-group {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.menu-item-title {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--text-main);
  line-height: 1.2;
}

.menu-item-desc {
  font-size: 0.71875rem;
  color: var(--text-muted);
  line-height: 1.35;
}

/* 下拉菜单弹出动画 */
.dropdown-pop-enter-active,
.dropdown-pop-leave-active {
  transition: opacity 0.15s cubic-bezier(0.16, 1, 0.3, 1), transform 0.15s cubic-bezier(0.16, 1, 0.3, 1);
  transform-origin: top right;
}

.dropdown-pop-enter-from,
.dropdown-pop-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-6px);
}

.btn-cancel-batch {
  background-color: var(--bg-surface);
  color: var(--text-main);
  border: 1px solid var(--border-strong);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-cancel-batch:hover {
  background-color: var(--bg-surface-hover);
  border-color: var(--text-main);
}

.btn-clear-all {
  color: var(--text-muted);
}
.btn-clear-all:hover:not(:disabled) {
  color: var(--text-main);
  border-color: var(--border-strong);
}

/* 连在一起的输入行列表 */
.connected-inputs-list {
  display: flex;
  flex-direction: column;
  position: relative;
}

/* 列表增减平滑硬件加速动效 (零回流 60fps 丝滑过渡) */
.row-fade-enter-active {
  transition: opacity 0.18s ease-out, transform 0.18s ease-out;
  will-change: transform, opacity;
}

.row-fade-leave-active {
  transition: opacity 0.15s ease-in, transform 0.15s ease-in;
  will-change: transform, opacity;
}

.row-fade-enter-from {
  opacity: 0;
  transform: scaleY(0.97) translateY(-4px);
}

.row-fade-leave-to {
  opacity: 0;
  transform: scaleY(0.97) translateY(-4px);
}

.row-fade-move {
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

/* 顶部批量控制栏显隐动效 */
.batch-bar-slide-enter-active,
.batch-bar-slide-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
  will-change: transform, opacity;
}

.batch-bar-slide-enter-from,
.batch-bar-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* 总结结果卡片显隐动效 */
.result-fade-enter-active,
.result-fade-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
  will-change: transform, opacity;
}

.result-fade-enter-from,
.result-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.connected-input-row-block {
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid var(--border-subtle);
  transition: all 0.2s ease;
}
.connected-input-row-block:last-child {
  border-bottom: none;
}

.connected-input-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 0.85rem;
  background-color: var(--bg-surface);
  transition: all 0.2s ease;
}
.connected-input-row:hover {
  background-color: var(--bg-surface-hover);
}

.connected-input-row .url-input-inner {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background-color: var(--bg-surface-subtle);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 0.3rem 0.4rem 0.3rem 0.75rem;
}

.main-unified-card .result-card {
  margin: 0.75rem 1rem 1rem 1rem;
  border: 1px solid var(--border-subtle);
}

.url-field {
  flex: 1;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  font-size: 0.9375rem;
  color: var(--text-main);
  padding: 0.4rem 0.25rem;
  min-width: 0;
}

.clear-input-btn,
.remove-card-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
  transition: all 0.15s ease;
}
.clear-input-btn:hover {
  background-color: var(--bg-surface-hover);
  color: var(--text-main);
}
.clear-input-btn.is-cancelling-btn {
  color: var(--text-main);
  background-color: var(--bg-surface-hover);
}
.clear-input-btn.is-cancelling-btn:hover {
  background-color: var(--text-main);
  color: var(--bg-surface);
}

.remove-card-btn:hover:not(:disabled) {
  background-color: var(--bg-surface-hover);
  color: var(--text-main);
}

.row-actions-group {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-shrink: 0;
}

.snapshot-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.55rem 0.85rem;
  border-radius: var(--radius-md);
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-main);
  background-color: var(--bg-surface-subtle);
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
  flex-shrink: 0;
}
.snapshot-action-btn:hover:not(:disabled) {
  background-color: var(--bg-surface-hover);
  border-color: var(--border-strong);
  color: var(--text-main);
}
.snapshot-action-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.submit-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0.55rem 1.15rem;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-is-queued {
  opacity: 0.85;
}

.spinner-icon {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: inline-block;
  flex-shrink: 0;
}

.dark-spinner {
  border-color: rgba(15, 23, 42, 0.2);
  border-top-color: var(--text-main);
}
html.dark .dark-spinner {
  border-color: rgba(255, 255, 255, 0.2);
  border-top-color: var(--text-main);
}

.homepage-toast-notification {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-full);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
  color: var(--text-main);
  font-size: 13px;
  font-weight: 500;
  backdrop-filter: blur(10px);
}

.toast-view-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-main);
  font-weight: 600;
  text-decoration: underline;
  margin-left: 6px;
  cursor: pointer;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 10px);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 3. 底部操作栏：直接与上面大方框连在一起 (两个独立小按钮) */
.unified-card-footer-bar {
  display: flex;
  align-items: center;
  border-top: 1px dashed var(--border-strong);
  background-color: var(--bg-surface-subtle);
}

.btn-footer-action {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0.65rem 1rem;
  background: transparent;
  border: none;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-footer-action:first-child {
  border-right: 1px dashed var(--border-strong);
}

.btn-footer-action:hover:not(:disabled) {
  color: var(--text-main);
  background-color: var(--bg-surface-hover);
}

@media (max-width: 640px) {
  .unified-card-footer-bar {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
  }
  .btn-footer-action {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem 1rem;
    box-sizing: border-box;
  }
  .btn-footer-action:first-child {
    border-right: none;
    border-bottom: 1px dashed var(--border-strong);
    width: 100%;
  }
}

.error-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0.85rem;
  background-color: var(--bg-surface-subtle);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  color: var(--text-main);
  font-size: 0.8125rem;
  margin: 0.35rem 0.85rem;
}

/* 独立结果卡片 */
.result-card {
  background-color: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  padding: 1.5rem;
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  animation: fadeIn 0.2s ease;
  transition: all 0.2s ease;
}

.result-card.is-collapsed-card {
  padding: 1rem 1.25rem;
  gap: 0.75rem;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.875rem;
  border-bottom: 1px solid var(--border-subtle);
  gap: 0.75rem;
}

.is-collapsed-card .result-header {
  padding-bottom: 0.6rem;
}

.result-brand-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
}

.generating-status {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap;
}

.status-pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: var(--text-main);
}

.result-time {
  font-size: 0.75rem;
  color: var(--text-subtle);
  white-space: nowrap;
}

.result-actions-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.action-buttons-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.action-btn {
  font-size: 0.8125rem;
  padding: 0.4rem 0.75rem;
  white-space: nowrap;
}

.toggle-collapse-btn {
  font-weight: 600;
}

.btn-close-card {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  padding: 0.35rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.btn-close-card:hover {
  color: var(--text-main);
  background-color: var(--bg-surface-hover);
}

.btn-success {
  background-color: var(--primary);
  color: var(--primary-contrast);
  border: 1px solid var(--primary);
  font-weight: 600;
}

.result-title-and-url-section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  background-color: var(--bg-surface-subtle);
  padding: 0.875rem 1rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
}

.is-collapsed-card .result-title-and-url-section {
  padding: 0.65rem 0.85rem;
}

.result-title-badge-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.25rem;
}

.home-folder-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 600;
  background-color: var(--bg-surface-subtle);
  border: 1px solid var(--border-subtle);
  color: var(--text-main);
  white-space: nowrap;
}

.result-display-title {
  font-size: 1.0625rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
}

.result-display-url {
  font-size: 0.8125rem;
  color: var(--link-blue);
  text-decoration: none;
  word-break: break-all;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.result-display-url:hover {
  text-decoration: underline;
}

.homepage-edit-box {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.homepage-summary-textarea {
  width: 100%;
  font-family: inherit;
  font-size: 0.875rem;
  line-height: 1.6;
  padding: 0.85rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background-color: var(--bg-surface-subtle);
  color: var(--text-main);
  resize: vertical;
}

.homepage-edit-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.result-markdown-body {
  font-size: 0.9375rem;
  line-height: 1.7;
  color: var(--text-main);
}

:deep(.md-main-title) {
  font-size: 1.15rem;
  font-weight: 700;
  margin-bottom: 0.65rem;
}

:deep(.md-section-title) {
  font-size: 1rem;
  font-weight: 600;
  margin-top: 0.85rem;
  margin-bottom: 0.4rem;
}

:deep(.md-divider) {
  border: none;
  border-top: 1px solid var(--border-subtle);
  margin: 0.85rem 0;
}

:deep(.md-todo-row) {
  display: flex;
  align-items: baseline;
  gap: 0.45rem;
  margin: 0.3rem 0;
}

:deep(.todo-box) {
  font-family: monospace;
  font-weight: 700;
}

:deep(.md-bullet-row) {
  display: flex;
  align-items: baseline;
  gap: 0.45rem;
  margin: 0.3rem 0;
}

:deep(.bullet-dot) {
  font-weight: 700;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* 移动端响应式适配 (375/425 尺寸) */
@media (max-width: 640px) {
  /* 顶部导航按钮：375 和 425 尺寸下仅显示图标，隐藏文字 */
  .nav-bookmarklet-btn span,
  .nav-update-btn span,
  .nav-logout-btn span,
  .theme-toggle-btn span,
  .nav-switch-btn span {
    display: none !important;
  }

  .nav-bookmarklet-btn,
  .nav-update-btn,
  .nav-logout-btn,
  .theme-toggle-btn,
  .nav-switch-btn {
    padding: 0.45rem !important;
    min-width: 32px;
    height: 32px;
    justify-content: center;
    border-radius: var(--radius-full);
  }

  .top-left-floating-bar,
  .top-right-floating-bar {
    top: 0.75rem;
    gap: 0.4rem;
  }
  .top-left-floating-bar {
    left: 0.75rem;
  }
  .top-right-floating-bar {
    right: 0.75rem;
  }

  .homepage-main {
    padding-top: 4.5rem;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }

  .hero-title {
    font-size: 1.65rem;
  }

  .connected-input-row {
    flex-direction: column;
    align-items: stretch;
    gap: 0.6rem;
    padding: 0.6rem;
  }

  .row-actions-group {
    display: flex;
    width: 100%;
    gap: 0.45rem;
  }

  .snapshot-action-btn {
    flex: 1;
    height: 40px;
    justify-content: center;
    font-size: 0.84rem;
  }

  .submit-action-btn {
    flex: 1.5;
    height: 40px;
    justify-content: center;
    border-radius: var(--radius-md);
    font-size: 0.875rem;
  }

  .result-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem 0.5rem;
    padding-bottom: 0.75rem;
  }

  .result-brand-info {
    order: 1;
  }

  .result-actions-wrapper {
    display: contents;
  }

  .btn-close-card {
    order: 2;
    margin-left: auto;
  }

  .action-buttons-group {
    order: 3;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.35rem;
    width: 100%;
  }

  .unit-action-subgroup {
    display: contents;
  }

  .action-btn {
    flex: 1;
    font-size: 0.75rem;
    padding: 0.45rem 0.2rem;
    justify-content: center;
    white-space: nowrap;
    text-align: center;
    gap: 0.25rem;
  }

  .batch-control-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  .batch-actions-group {
    flex-direction: column;
  }
  .batch-action-btn {
    width: 100%;
    justify-content: center;
  }
}

/* 仅在 375 尺寸 (<= 390px) 下换行排布：折叠按钮单独一行，编辑/保存/复制按钮换行独立成排 */
@media (max-width: 390px) {
  .action-buttons-group {
    flex-wrap: wrap !important;
    gap: 0.4rem !important;
  }
  .toggle-collapse-btn {
    width: 100% !important;
    flex: none !important;
  }
  .unit-action-subgroup {
    display: flex !important;
    width: 100% !important;
    gap: 0.35rem !important;
  }
  .unit-action-subgroup .action-btn {
    flex: 1 !important;
  }
}
</style>
