# 版本发布规范 (Release Management Rules)

每次发布新版本时，必须严格遵守以下规范：

1. **本地版本目录隔离与防泄露**：
   - 打包产物必须输出在项目根目录下的 `release/v{VERSION}/` 独立子目录下（如 `release/v1.1.0/`）。
   - **严防上传 GitHub**：`release/` 目录必须在 `.gitignore` 中被严格忽略，绝对禁止将安装包和本地 release 文件推送到 Git 代码仓库。
2. **纯净资产包含 (仅保留最新版必需文件，杜绝冗余)**：
   - 每个版本的子目录中仅包含：
     - `inkgist-v{VERSION}-standalone.zip` (Node 服务端独立运行完整安装包)
     - `inkgist-bookmarks-extension.zip` (浏览器扩展压缩包)
     - `inkgist-bookmarks-assistant.crx` (浏览器扩展安装包)
     - `checksums.txt` (全附件 SHA-256 校验和)
     - `release-notes.md` (配套的双语版本更新说明文档)
3. **版本号与 Cloudflare 边缘兼容**：
   - 发布新版本前，必须在 `package.json` 中提升 `version`，并在 `nuxt.config.ts` 中通过 `runtimeConfig.public.appVersion` 注入，确保 Cloudflare Pages / Workers 自动部署后能够准确展示最新版本。
