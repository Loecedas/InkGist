# InkGist v1.0.0

> 墨萃 InkGist — 轻量高颜值 AI 网页智能速读、像素级离线快照与多层级书签管理平台  
> AI-powered web reading companion, pixel-perfect offline snapshot archiver, and hierarchical bookmark management system.

---

## 🇨🇳 中文版本说明 (Release Notes - CN)

### ✨ 新增功能
- **📸 网页全量离线快照 (Offline Snapshots)**：
  - 支持直接在首页粘贴 URL 一键捕获无损离线快照；
  - 100% 还原原网页图文排版、嵌入样式与字体资产，突破反爬、登录墙与折叠拦截；
  - 正文全量保存在浏览器本地 IndexedDB 中，并生成专属永久离线分享链接，彻底解决 404 与内容失效问题；
  - 快照库提供全功能画廊浏览、搜索与批量管理，支持 1024px 与移动端自适应响应式排布。
- **🤖 AI 深度智能速读 (AI Deep Summaries)**：
  - 集成 Defuddle 高性能正文提取引擎；
  - 接入 Gemini、OpenAI、Claude、DeepSeek、GLM 等主流大模型及自定义 OpenAI 兼容接口；
  - 秒级生成核心价值摘要、提纲脑图与精选金句，支持实时打字机流式输出与在线二次编辑；
  - 支持最多 5 任务受控并发流水线批量处理。
- **📑 现代化书签管理系统 (Hierarchical Bookmarks)**：
  - 支持无限层级文件夹分类、标签筛选与模糊搜索；
  - 完美支持标准 Netscape HTML 书签格式一键导入与导出（兼容 Chrome / Edge / Firefox / Safari）；
  - 响应式多列布局自由切换（1 列 / 2 列 / 3 列）。
- **⚡ 跨端免扩展小书签 (Universal Bookmarklet)**：
  - 无需安装任何臃肿的浏览器插件，拖拽小书签至浏览器书签栏即可在任意第三方网页一键呼出快照或智能总结。
- **🔄 系统平滑在线自动更新 (Seamless Auto-Update)**：
  - 贴心内置版本检测与在线更新弹窗，支持中英双语更新说明无缝切换；
  - 完美适配 Git/Node.js、Docker 容器化、1Panel / 宝塔面板等多种部署形态；
  - 数据层与程序层完全解耦，升级过程绝不覆盖或影响已有书签与快照数据。

---

## 🇺🇸 English Release Notes (EN)

### ✨ New Features
- **📸 Full-Fidelity Offline Web Snapshots**:
  - Direct one-click snapshot generation from homepage URL inputs;
  - 100% lossless DOM and styling preservation with embedded images and fonts, immune to 404s, login gates, and anti-crawler barriers;
  - Persistent offline storage backed by IndexedDB with dedicated sharable offline URLs;
  - Clean gallery view with search, filtering, and responsive grid layouts (optimized for 1024px tablets and mobile screens).
- **🤖 AI Deep Summaries & Multi-Model Support**:
  - Powered by Defuddle content extraction engine;
  - Seamlessly integrated with Gemini, OpenAI, Claude, DeepSeek, GLM, and custom OpenAI-compatible endpoints;
  - Real-time streaming output of executive summaries, structured outlines, and key takeaways with interactive in-place markdown editing;
  - Controlled 5-concurrency pipeline batch processing.
- **📑 Hierarchical Bookmark Management**:
  - Unlimited nested folder organization, tag filtering, and fuzzy search;
  - Full compatibility with Netscape HTML standard bookmark import and export (Chrome, Edge, Safari, Firefox);
  - Dynamic multi-column layout switching (1 / 2 / 3 columns).
- **⚡ Universal Zero-Dependency Bookmarklet**:
  - Drag-and-drop to browser bookmark bar for instant snapshots or summaries without extension installs.
- **🔄 Non-Destructive In-App Updates**:
  - Built-in update check with bilingual (CN/EN) release notes switching;
  - Supports Git/Node.js, Docker containers, and 1Panel/BT-Panel workflows without touching user data.

---

## 📥 安装与部署 / Installation & Deployment

### 🐳 Docker 部署 (推荐 / Recommended)
```bash
# 直接拉取并运行
docker run -d \
  --name inkgist \
  -p 3000:3000 \
  -v inkgist_data:/app/data \
  --restart unless-stopped \
  ghcr.io/loecedas/inkgist:latest
```

### 💻 Node.js / Git 部署
```bash
# 克隆仓库
git clone https://github.com/Loecedas/InkGist.git
cd InkGist

# 安装依赖
npm install

# 构建并启动服务
npm run build
node .output/server/index.mjs
```

### ⚡ 宝塔 / 1Panel 面板部署
- 在 Node 项目或 Docker 编排中导入仓库地址 `https://github.com/Loecedas/InkGist.git`，设置端口为 `3000` 即可。

---

## 📚 相关链接 / Documentation
- **GitHub 仓库 / Repository**: [https://github.com/Loecedas/InkGist](https://github.com/Loecedas/InkGist)
- **在线演示与发布页 / Releases**: [https://github.com/Loecedas/InkGist/releases](https://github.com/Loecedas/InkGist/releases)
