# 🖋️ 墨萃 · InkGist

<div align="center">

**极简黑白墨韵 · AI 网页智能速读与全功能多用户云端书签平台**

<p align="center">
  <b>简体中文</b> | <a href="./README_EN.md">English</a>
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-0f172a.svg)](./LICENSE)
[![Nuxt](https://img.shields.io/badge/Nuxt-4.x-00DC82?logo=nuxt.js)](https://nuxt.com/)
[![Vue](https://img.shields.io/badge/Vue-3.x-4FC08D?logo=vuedotjs)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-17%20Passed-10b981.svg)](./tests/test-suite.mjs)

**墨萃 (InkGist) —— 基于 Nuxt 4 + Vue 3 的极简纯黑白风格 AI 网页速读工具与多用户智能书签管理系统**

</div>

---

## ✨ 核心特性

- ⚡ **AI 秒级网页深度速读**：输入任意公网链接，秒级提炼「一句话概括」、「智能标签」、「核心功能说明」与「待办行动指南」，告别冗长阅读。
- 🚀 **Karakeep (Hoarder) API 一键直连同步**：
  - 支持直连同步至 Karakeep 官方云端（`cloud.karakeep.app`）或本地/局域网私有化实例；
  - **字段 100% 精准对齐**：网页标题严格一致，自动提取「一句话概括」填入描述栏，提取「核心功能说明」填入概括栏，提取行动指南填入笔记栏；
  - **分类与标签自动关联**：自动匹配并创建 Karakeep Lists 文件夹，智能标签全量同步；
  - **极简免扰体验**：可在 `.env` 中预设实例地址与 API Key，弹窗中勾选书签后一键直达推送。
- 📦 **全生态书签导出与知识库笔记归档**：
  - **浏览器标准书签 (.html)**：遵循 Netscape Bookmark 规范，内嵌完整多级分类目录树、图标与标签；
  - **Obsidian / Markdown 知识库 (.md)**：生成带标准 YAML Frontmatter、分类标题、超链接与深度 AI 总结的知识库归档文件，兼容 Obsidian、Notion、Logseq、语雀等；
  - **2 + 1 经典网格响应式排布**：针对 375px、425px、768px、1024px 及桌面宽屏进行了专门的自适应换行排版。
- 🧩 **官方浏览器扩展（墨萃-InkGist）**：
  - 一键读取 Chrome / Edge 收藏夹，支持自由勾选与批量导入；
  - 双向握手探活机制，断连/卸载即时响应；支持备选导入本地导出的 `bookmarks.html` 文件。
- 📌 **浏览器小书签（Bookmarklet）**：鼠标拖拽即可将小书签放置在浏览器书签栏，在任意网页一键点击直达墨萃完成总结。
- ⚙️ **全局受控 5 并发流水线与排队机制**：
  - 支持多网址独立输入框增减与一键批量开始总结；
  - 严格受控于 `MAX_CONCURRENT = 5`，超过 5 个任务自动平滑进入排队队列（`⏳ 排队等待中...`）；
  - 支持单任务与全部任务的一键中止控制器（AbortController）。
- 🛡️ **智能排重与严格有效性校验**：
  - 网址导入与手动启动均具备标准化 URL 查重，全流程提供友好提示并自动过滤重复项；
  - 严格校验合法公网域名，无效网址精准拦截并伴有 5 秒自动平滑消除提示。
- 📑 **全功能云端书签管理**：
  - **拖拽归类**：卡片长按可自由拖拽投入分类文件夹；
  - **悬停预览**：鼠标滑过文件夹可即时下拉预览包含的书签列表；
  - **内联修改**：支持在卡片上直接内联修改总结文字并实时同步保存；
  - **列数切换**：支持 1 列 / 2 列 / 3 列网格排布自适应切换与 Cookie 持久化。
- 🔐 **多用户独立账户与安全存储**：
  - 独立登录与注册页面，密码采用 `PBKDF2-SHA512`（100,000 次加盐强哈希）；
  - 365 天防丢失签名 Token 鉴权引擎，支持单用户书签数据完全隔离；
  - 内置 DNS 嗅探级别 SSRF 私有内网拦截，彻底封堵内网渗透与回环访问。
- 🎨 **极简黑白墨韵设计与全端适配**：
  - 纯黑白水墨质感，支持 **深色模式 / 浅色模式 / 跟随系统** 一键切换；
  - 硬件加速 60FPS 流畅动效，深度适配移动端、平板与桌面端。

---

## 🛠️ 技术架构

- **前端框架**：Nuxt 4.x + Vue 3.x (Composition API) + TypeScript
- **服务端引擎**：Nitro Server Engine + H3
- **网页提取引擎**：Defuddle（本地离线高效清洗） + Jina Reader（网络降级容灾）
- **大模型生态**：智谱 AI（`glm-4.6v-flash`）、DeepSeek（`deepseek-chat`）、Google Gemini（`gemini-2.0-flash`）
- **数据持久化**：原生分表 JSON 持久化引擎 / Cloudflare D1 双轨支持
- **第三方生态互通**：Karakeep (Hoarder) REST API、Netscape Bookmark HTML、Obsidian Markdown
- **测试体系**：内置 17 项全量自动化测试套件（覆盖 SSRF、限流、XSS清洗、哈希、鉴权、多级HTML栈式解析、批量引擎与 Karakeep 字段语义映射）

---

## 🚀 快速上手与部署

### 方案 A：本地 / VPS 私有化部署（推荐）

项目默认内置本地轻量 JSON 持久化引擎，**无需安装 MySQL/Redis**：

#### 1. 克隆项目并安装依赖

```bash
git clone https://github.com/Loecedas/InkGist.git
cd InkGist
npm install
```

#### 2. 配置环境变量

```bash
cp .env.example .env
```

在 `.env` 中填写您拥有的大模型 API Key 与可选的第三方配置：

```env
# 1. 大模型配置 (智谱 AI、DeepSeek 或 Gemini 任填一个即可)
ZHIPU_API_KEY=your_zhipu_api_key_here
ZHIPU_MODEL=glm-4.6v-flash
DEFAULT_PROVIDER=auto

# 2. Karakeep (Hoarder) 同步配置 (可选 - 支持官方云端或私有部署)
KARAKEEP_INSTANCE_URL=https://cloud.karakeep.app
KARAKEEP_API_KEY=your_karakeep_api_key_here
```

#### 3. 启动开发与生产构建

- **开发模式**：
  ```bash
  npm run dev
  ```
  打开浏览器访问 [http://localhost:3000](http://localhost:3000) 即可开始使用。

- **生产环境运行**：
  ```bash
  npm run build
  node .output/server/index.mjs
  # 或使用 PM2 常驻守护：
  # pm2 start .output/server/index.mjs --name inkgist
  ```

- **运行全量自动化测试**：
  ```bash
  npm test
  ```

---

### 方案 B：Cloudflare Workers + D1 边缘部署（0 成本部署）

1. **创建 Cloudflare D1 数据库**：
   ```bash
   npx wrangler d1 create inkgist-db
   ```
2. **初始化数据表**：
   ```bash
   npx wrangler d1 execute inkgist-db --file=./schema.sql
   ```
3. **在 `wrangler.json` 中填入 D1 数据库 ID**。
4. **设置大模型密钥并发布**：
   ```bash
   npx wrangler secret put ZHIPU_API_KEY
   npm run build
   npx wrangler deploy
   ```

---

### 🧩 浏览器扩展安装

1. 打开 Chrome / Edge，进入扩展管理页（`chrome://extensions/` 或 `edge://extensions/`）；
2. 开启右上角 **「开发者模式」**；
3. 点击 **「加载已解压的扩展程序」**，选择项目中的 `extension/` 文件夹即可完成安装。

---

## 📁 目录结构

```text
├── app/                     # 前端源码专属目录 (srcDir: 'app')
│   ├── app.vue              # 全局根入口 (水墨主题注入 + 路由拦截)
│   ├── components/          # 核心交互组件
│   │   ├── BookmarkCard.vue             # 书签卡片组件 (内联编辑、拖拽归类、自适应排版)
│   │   ├── BookmarkletModal.vue         # 浏览器小书签弹窗
│   │   ├── ExportBookmarkModal.vue      # 导出与 Karakeep 直连同步弹窗 (2+1 网格排版)
│   │   ├── ExtensionInstallModal.vue    # 官方扩展安装与书签导入弹窗
│   │   ├── MobileFolderSelectModal.vue  # 移动端分类选择抽屉
│   │   ├── RenameFolderModal.vue        # 分类重命名弹窗
│   │   └── AppFooter.vue                # 极简通用页脚
│   ├── pages/               # 前端核心页面与全局状态
│   │   ├── index.vue        # 首页 (AI 智能总结核心区、5并发排队流水线)
│   │   ├── bookmarks.vue    # 书签页 (吸顶导航、分类拖拽、网格切换)
│   │   ├── login.vue        # 独立登录与注册页面
│   │   └── state.ts         # 全局响应式状态、Cookie 同步与 SVG 图标库
│   └── utils/               # 前端工具库
│       ├── bookmark-io.ts   # Netscape HTML 栈式解析与树状构建引擎
│       └── task-queue.ts    # 任务调度与并发控制队列
├── extension/               # 墨萃-InkGist 官方浏览器扩展 (Manifest V3)
│   ├── manifest.json        # 扩展配置清单
│   ├── background.js        # 后台 Service Worker
│   ├── content.js           # 页面安全通信与探活脚本
│   ├── popup.html / popup.js# 扩展弹出面板
│   └── icon16/48/128.png    # 高清拼图 Emoji 扩展图标
├── server/                  # 服务端 API 与数据持久化
│   ├── api/                 # 后端路由
│   │   ├── auth/            # 用户注册、登录与鉴权校验
│   │   ├── sync/karakeep    # Karakeep (Hoarder) REST API 安全直连代理
│   │   ├── summarize.post.ts# AI 深度总结核心路由
│   │   └── bookmarks/       # 书签与分类 CRUD 接口
│   └── utils/               # 后端工具库
│       ├── db.ts            # 分表持久化数据库引擎
│       ├── summary-parser.ts# AI 总结语义提取器 (映射 Karakeep 字段)
│       └── index.ts         # 密码加盐哈希、Token 签名与 SSRF 防护
├── tests/                   # 自动化测试套件 (17 项测试用例)
│   └── test-suite.mjs       # 全量单元与集成自动化测试
├── public/                  # 静态资源 (favicon.svg, 扩展离线包)
├── nuxt.config.ts           # Nuxt 核心配置 (runtimeConfig 动态热载)
├── package.json             # 依赖配置
├── .env.example             # 环境变量示例模板
└── LICENSE                  # MIT 开源许可证
```

---

## 📄 开源许可证

本项目基于 [MIT License](./LICENSE) 协议开源。
