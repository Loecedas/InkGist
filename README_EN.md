# 🖋️ InkGist · 墨萃

<div align="center">

**Minimalist Monochrome AI Web Summarizer & Multi-Tenant Cloud Bookmark Platform**

<p align="center">
  <a href="./README.md">简体中文</a> | <b>English</b>
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-0f172a.svg)](./LICENSE)
[![Nuxt](https://img.shields.io/badge/Nuxt-4.x-00DC82?logo=nuxt.js)](https://nuxt.com/)
[![Vue](https://img.shields.io/badge/Vue-3.x-4FC08D?logo=vuedotjs)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-17%20Passed-10b981.svg)](./tests/test-suite.mjs)

**InkGist (墨萃) — A minimalist monochrome AI web reading tool and multi-tenant smart bookmark system built with Nuxt 4 and Vue 3.**

</div>

---

## ✨ Features

- ⚡ **Instant AI Web Summarization**: Input any public URL to extract a **One-Liner Overview**, **Smart Tags**, **Core Features Overview**, and **Action Items Checklist**.
- 🚀 **Direct Karakeep (Hoarder) API Sync**:
  - Seamless one-click sync to Karakeep Cloud (`cloud.karakeep.app`) or self-hosted instances;
  - **100% Precise Field Mapping**: Matches title exactly, maps "One-Liner Overview" to `description`, "Core Features" to `summary`, action items to `notes`, and automatically creates/links corresponding Lists and smart tags;
  - **Distraction-Free Experience**: Configure instance URL and API Key in `.env` for zero-input, one-click background sync.
- 📦 **Universal Bookmark Export & Knowledge Base Archive**:
  - **Standard Browser Bookmarks (.html)**: Follows Netscape Bookmark specification with full multi-level folder trees, favicons, and tags;
  - **Obsidian / Markdown Knowledge Archive (.md)**: Exports structured notes with YAML Frontmatter, category headers, hyperlinks, and AI summaries compatible with Obsidian, Notion, Logseq, and more;
  - **2 + 1 Responsive Grid Layout**: Tailored layout on all screen sizes (375px, 425px, 768px, 1024px, and wide desktops).
- 🧩 **Official Browser Extension (InkGist)**:
  - Read local Chrome/Edge bookmarks directly with selective or bulk import;
  - Live bidirectional ping-pong handshake mechanism with instant disconnection detection;
  - Standalone support for importing exported `bookmarks.html` files.
- 📌 **Browser Bookmarklet**: Drag-and-drop bookmarklet button to trigger InkGist AI summaries directly from any active tab.
- ⚙️ **Controlled 5-Concurrency Pipeline & Queue**:
  - Independent URL input rows with batch execution;
  - Strict concurrency cap at `MAX_CONCURRENT = 5` with automatic queueing (`⏳ Queued waiting...`);
  - Single-task and all-tasks cancellation via `AbortController`.
- 🛡️ **Smart Deduplication & Strict Validation**:
  - URL normalization to prevent concurrent and repeated summaries with clear user notifications;
  - Strict public URL validation with 5-second auto-dismissing feedback banners.
- 📑 **Comprehensive Bookmark Management**:
  - **Drag & Drop Categorization**: Drag bookmark cards directly into folder tabs;
  - **Hover Preview**: Hover over any category tab for an instant dropdown preview of bookmarks;
  - **Inline Text Editing**: Edit summaries directly on cards with real-time saving;
  - **Dynamic Grid Layouts**: 1-column, 2-column, and 3-column views with persistent cookie synchronization.
- 🔐 **Multi-User Account & Security**:
  - Standalone login & registration with `PBKDF2-SHA512` (100,000 rounds salted hashing);
  - 365-day signature Token authentication engine with isolated multi-tenant storage;
  - DNS-sniffing SSRF private subnet protection.
- 🎨 **Minimalist Monochrome Aesthetics**:
  - Pure black & white ink-wash styling with **Dark / Light / System** themes;
  - GPU-accelerated 60FPS transitions and tailored responsive layouts across all devices.

---

## 🛠️ Tech Stack

- **Frontend**: Nuxt 4.x + Vue 3.x (Composition API) + TypeScript
- **Backend Server**: Nitro Server Engine + H3
- **Scraping Engine**: Defuddle (Local clean text extractor) + Jina Reader (Fallback proxy)
- **AI Models**: Zhipu AI (`glm-4.6v-flash`), DeepSeek (`deepseek-chat`), Google Gemini (`gemini-2.0-flash`)
- **Data Layer**: Native JSON storage engine / Cloudflare D1 dual-mode
- **Third-Party Integrations**: Karakeep (Hoarder) REST API, Netscape Bookmark HTML, Obsidian Markdown
- **Automated Tests**: Comprehensive 17-test suite covering SSRF, rate limiting, XSS sanitization, password hashing, token signing, stack-based HTML parsing, and Karakeep field mapping

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

Add your API Key in `.env` (Zhipu AI, DeepSeek, or Gemini, along with optional Karakeep settings):

```env
# 1. AI Model Config (Zhipu, DeepSeek, or Gemini)
ZHIPU_API_KEY=your_zhipu_api_key_here
ZHIPU_MODEL=glm-4.6v-flash
DEFAULT_PROVIDER=auto

# 2. Karakeep (Hoarder) Sync Config (Optional - Cloud or Self-Hosted)
KARAKEEP_INSTANCE_URL=https://cloud.karakeep.app
KARAKEEP_API_KEY=your_karakeep_api_key_here
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

## 📁 Directory Structure

```text
├── app/                     # Frontend source directory (srcDir: 'app')
│   ├── app.vue              # App root component
│   ├── components/          # Core interactive components
│   │   ├── BookmarkCard.vue             # Bookmark card (inline editing, drag-drop)
│   │   ├── BookmarkletModal.vue         # Browser bookmarklet modal
│   │   ├── ExportBookmarkModal.vue      # Export & Karakeep sync modal (2+1 grid layout)
│   │   ├── ExtensionInstallModal.vue    # Extension install & import modal
│   │   ├── MobileFolderSelectModal.vue  # Mobile category drawer
│   │   ├── RenameFolderModal.vue        # Category rename modal
│   │   └── AppFooter.vue                # Minimalist footer
│   ├── pages/               # Application pages and global state
│   │   ├── index.vue        # Home (AI summarization, 5-concurrency pipeline)
│   │   ├── bookmarks.vue    # Bookmarks page (sticky nav, folder tabs, grid views)
│   │   ├── login.vue        # Standalone login & register page
│   │   └── state.ts         # Global reactive state, cookie sync, and SVG icons
│   └── utils/               # Frontend utilities
│       ├── bookmark-io.ts   # Netscape HTML parsing & building engine
│       └── task-queue.ts    # Concurrency control & task queue
├── extension/               # InkGist Official Browser Extension (Manifest V3)
│   ├── manifest.json        # Extension manifest
│   ├── background.js        # Background Service Worker
│   ├── content.js           # Content script for handshake communication
│   ├── popup.html / popup.js# Popup panel
│   └── icon16/48/128.png    # Extension icons
├── server/                  # Backend API & data persistence
│   ├── api/                 # Server routes
│   │   ├── auth/            # Authentication & registration routes
│   │   ├── sync/karakeep    # Karakeep (Hoarder) REST API proxy
│   │   ├── summarize.post.ts# AI summarization core endpoint
│   │   └── bookmarks/       # Bookmarks & folders CRUD APIs
│   └── utils/               # Server utilities
│       ├── db.ts            # Local JSON persistence engine
│       ├── summary-parser.ts# AI summary parser for Karakeep field mapping
│       └── index.ts         # Password hashing, token signing & SSRF protection
├── tests/                   # Automated test suite (17 test cases)
│   └── test-suite.mjs       # Full unit & integration test runner
├── public/                  # Static assets
├── nuxt.config.ts           # Nuxt configuration
├── package.json             # Package scripts & dependencies
├── .env.example             # Environment variables example template
└── LICENSE                  # MIT License
```

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).
