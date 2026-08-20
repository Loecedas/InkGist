# 🖋️ InkGist · 墨萃

<div align="center">

**Minimalist Monochrome AI Web Summarizer & Multi-Tenant Bookmark Manager**

<p align="center">
  <a href="./README.md">简体中文</a> | <b>English</b>
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-0f172a.svg)](./LICENSE)
[![Nuxt](https://img.shields.io/badge/Nuxt-4.x-00DC82?logo=nuxt.js)](https://nuxt.com/)
[![Vue](https://img.shields.io/badge/Vue-3.x-4FC08D?logo=vuedotjs)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-9%20Passed-10b981.svg)](./tests/test-suite.mjs)

**InkGist (墨萃) — A minimalist monochrome AI web reading tool and multi-tenant smart bookmark system built with Nuxt 4 and Vue 3.**

</div>

---

## ✨ Features

- ⚡ **Instant AI Web Summarization**: Input any public URL to extract a **One-Liner Overview**, **Smart Tags**, **Core Features Overview**, and **Action Items Checklist**.
- 🧩 **Official Browser Extension (InkGist)**:
  - Read local Chrome/Edge bookmarks directly with selective or bulk import.
  - Live bidirectional ping-pong handshake mechanism with instant disconnection detection.
  - Standalone support for importing exported `bookmarks.html` files.
- 📌 **Browser Bookmarklet**: Drag-and-drop bookmarklet button to trigger InkGist AI summaries directly from any active tab.
- 🚀 **Controlled 5-Concurrency Pipeline & Queue**:
  - Independent URL input rows with batch execution.
  - Strict concurrency cap at `MAX_CONCURRENT = 5` with automatic queueing (`⏳ Queued waiting...`).
  - Single-task and all-tasks cancellation via `AbortController`.
- 🛡️ **Smart Deduplication & Strict Validation**:
  - URL normalization to prevent concurrent and repeated summaries with clear user notifications.
  - Strict public URL validation with 5-second auto-dismissing feedback banners.
- 📑 **Comprehensive Bookmark Management**:
  - **Drag & Drop Categorization**: Drag bookmark cards directly into folder tabs.
  - **Hover Preview**: Hover over any category tab for an instant dropdown preview of bookmarks.
  - **Inline Text Editing**: Edit summaries directly on cards with real-time saving.
  - **Dynamic Grid Layouts**: 1-column, 2-column, and 3-column views.
- 🔐 **Multi-User Account & Security**:
  - Standalone login & registration with `PBKDF2-SHA512` (100,000 rounds salted hashing).
  - DNS-sniffing SSRF private subnet protection.
  - Dual-engine persistence: Native JSON storage and Cloudflare D1 database.
- 🎨 **Minimalist Monochrome Aesthetics**:
  - Pure black & white ink-wash styling with **Dark / Light / System** themes.
  - GPU-accelerated 60FPS transitions and tailored responsive layouts for **375px (auto-wrap), 425px, 768px, 1024px**, and desktop screens.

---

## 🛠️ Tech Stack

- **Frontend**: Nuxt 4.x + Vue 3.x (Composition API) + TypeScript
- **Backend Server**: Nitro Server Engine + H3
- **Scraping Engine**: Defuddle (Local clean text extractor) + Jina Reader (Fallback proxy)
- **AI Models**: Zhipu AI (`glm-4.6v-flash`), DeepSeek (`deepseek-chat`), Google Gemini (`gemini-2.0-flash`)
- **Data Layer**: Decoupled JSON storage engine / Cloudflare D1 dual-mode
- **Automated Tests**: Test suite covering SSRF, rate limiting, XSS sanitization, password hashing, and token signing

---

## 🚀 Quick Start & Deployment

### Option A: Local / VPS Self-Hosted (Recommended)

Default local JSON storage engine requires **no external database (zero MySQL/Redis dependency)**:

#### 1. Clone & Install

```bash
git clone https://github.com/Loecedas/InkGist.git
cd InkGist
npm install
```

#### 2. Configure Environment

```bash
cp .env.example .env
```

Add your API Key in `.env` (Zhipu AI, DeepSeek, or Gemini):

```env
ZHIPU_API_KEY=your_zhipu_api_key_here
ZHIPU_MODEL=glm-4.6v-flash
DEFAULT_PROVIDER=auto
```

#### 3. Run Development Server or Production Build

- **Development Mode**:
  ```bash
  npm run dev
  ```
  Visit [http://localhost:3000](http://localhost:3000) in your browser.

- **Production Build**:
  ```bash
  npm run build
  node .output/server/index.mjs
  # Or run with PM2:
  # pm2 start .output/server/index.mjs --name inkgist
  ```

- **Run Automated Tests**:
  ```bash
  npm test
  ```

---

### Option B: Cloudflare Workers + D1 Serverless Deployment

1. **Create Cloudflare D1 Database**:
   ```bash
   npx wrangler d1 create inkgist-db
   ```
2. **Execute Schema Migration**:
   ```bash
   npx wrangler d1 execute inkgist-db --file=./schema.sql
   ```
3. **Add Database ID to `wrangler.json`**.
4. **Set Secrets and Deploy**:
   ```bash
   npx wrangler secret put ZHIPU_API_KEY
   npm run build
   npx wrangler deploy
   ```

---

### 🧩 Browser Extension Setup

1. Open Chrome or Edge and go to Extensions (`chrome://extensions/` or `edge://extensions/`);
2. Enable **Developer mode** in the top-right corner;
3. Click **Load unpacked** and select the `extension/` folder in this repo.

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).
