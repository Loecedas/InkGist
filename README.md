# 🖋️ 墨萃 · InkGist

<div align="center">

**极简黑白墨韵 · AI 网页智能速读与全功能多用户云端书签平台**

[![License: MIT](https://img.shields.io/badge/License-MIT-0f172a.svg)](./LICENSE)
[![Nuxt](https://img.shields.io/badge/Nuxt-4.x-00DC82?logo=nuxt.js)](https://nuxt.com/)
[![Vue](https://img.shields.io/badge/Vue-3.x-4FC08D?logo=vuedotjs)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-9%20Passed-10b981.svg)](./tests/test-suite.mjs)

**墨萃 (InkGist) —— 基于 Nuxt 4 + Vue 3 的极简纯黑白风格 AI 网页速读工具与多用户智能书签管理系统**

</div>

---

## ✨ 核心特性

- ⚡ **AI 秒级网页速读**：输入任意公网链接，秒级深度提炼「一句话概括」、「智能标签」、「核心功能说明」与「待办行动指南」，告别冗长阅读。
- 🧩 **官方浏览器扩展（墨萃-InkGist）**：
  - 支持一键直接读取当前 Chrome / Edge 浏览器的完整收藏夹，自主勾选或批量导入；
  - 具备实时双向握手探活机制，断连/卸载即时响应；
  - 支持备选导入本地导出的 `bookmarks.html` 文件。
- 📌 **浏览器小书签（Bookmarklet）**：鼠标拖拽即可将小书签放置在浏览器书签栏，在任意网页一键点击直达墨萃完成总结。
- 🚀 **全局受控 5 并发流水线与排队机制**：
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
  - **列数切换**：支持 1 列 / 2 列 / 3 列网格排布自适应切换。
- 🔐 **多用户独立账户与安全存储**：
  - 独立登录与注册页面，密码采用 `PBKDF2-SHA512`（100,000 次加盐哈希）；
  - 内置 DNS 嗅探级别 SSRF 私有内网拦截，彻底封堵内网渗透与回环访问；
  - 本地分表 JSON 持久化与 Cloudflare D1 双轨数据库引擎支持。
- 🎨 **极简黑白墨韵设计与全端适配**：
  - 纯黑白水墨质感，支持 **深色模式 / 浅色模式 / 跟随系统** 一键切换；
  - 硬件加速 60FPS 流畅动效；针对 **375px（智能换行）、425px、768px、1024px** 及桌面端进行了细致的自适应布局优化。

---

## 🛠️ 技术架构

- **前端框架**：Nuxt 4.x + Vue 3.x (Composition API) + TypeScript
- **服务端引擎**：Nitro Server Engine + H3
- **网页提取引擎**：Defuddle（本地离线高效清洗） + Jina Reader（网络降级容灾）
- **大模型生态**：智谱 AI（`glm-4.6v-flash`）、DeepSeek（`deepseek-chat`）、Google Gemini（`gemini-2.0-flash`）
- **数据持久化**：原生分表 JSON 持久化引擎 / Cloudflare D1 双轨支持
- **测试体系**：内置自动化测试套件（覆盖 SSRF、限流、XSS清洗、哈希与鉴权）

---

## 🚀 快速上手

### 1. 克隆项目并安装依赖

```bash
git clone https://github.com/your-username/inkgist.git
cd inkgist
npm install
```

### 2. 配置环境变量

复制环境变量模板文件并填写您的大模型 API 密钥：

```bash
cp .env.example .env
```

在 `.env` 中填写对应的 API Key（例如智谱 AI、DeepSeek 或 Gemini）：

```env
ZHIPU_API_KEY=your_zhipu_api_key_here
ZHIPU_MODEL=glm-4.6v-flash
DEFAULT_PROVIDER=auto
```

### 3. 启动开发服务器

```bash
npm run dev
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000) 即可开始使用！

### 4. 运行自动化测试套件

```bash
npm test
```

### 5. 生产环境构建

```bash
npm run build
npm run preview
```

---

## 📁 目录结构

```text
├── app/                     # 前端源码专属目录 (srcDir: 'app')
│   ├── app.vue              # 全局根入口 (水墨主题注入 + 路由拦截)
│   ├── components/          # 核心交互组件
│   │   ├── BookmarkCard.vue             # 书签卡片组件 (内联编辑、拖拽归类)
│   │   ├── BookmarkletModal.vue         # 浏览器小书签弹窗
│   │   ├── ExtensionInstallModal.vue    # 官方扩展安装与书签导入弹窗
│   │   ├── MobileFolderSelectModal.vue  # 移动端分类选择抽屉
│   │   ├── RenameFolderModal.vue        # 分类重命名弹窗
│   │   └── AppFooter.vue                # 极简通用页脚
│   └── pages/               # 前端核心页面与全局状态
│       ├── index.vue        # 首页 (AI 智能总结核心区、5并发排队流水线)
│       ├── bookmarks.vue    # 书签页 (吸顶导航、分类拖拽、网格切换)
│       ├── login.vue        # 独立登录与注册页面
│       └── state.ts         # 全局响应式状态与 SVG 图标库
├── extension/               # 墨萃-InkGist 官方浏览器扩展 (Manifest V3)
│   ├── manifest.json        # 扩展配置清单
│   ├── background.js        # 后台 Service Worker
│   ├── content.js           # 页面安全通信与探活脚本
│   ├── popup.html / popup.js# 扩展弹出面板
│   └── icon16/48/128.png    # 高清拼图 Emoji 扩展图标
├── scripts/                 # 辅助构建与自动化脚本
│   ├── pack-zip.mjs         # 扩展自动压缩打包脚本
│   └── generate-icons.mjs   # 扩展高清图标生成脚本
├── server/                  # 服务端 API 与数据持久化
│   ├── api/                 # 后端路由 (auth, user, summarize, quota)
│   └── utils/               # 数据库引擎、密码哈希与 SSRF 拦截统一模块
├── tests/                   # 自动化测试套件 (test-suite.mjs)
├── public/                  # 静态资源 (favicon.svg, 扩展离线包)
├── nuxt.config.ts           # Nuxt 核心配置
├── package.json             # 依赖配置
├── .env.example             # 环境变量示例模板
└── LICENSE                  # MIT 开源许可证
```

---

## 📄 开源许可证

本项目基于 [MIT License](./LICENSE) 协议开源。
