# 版本发布规范 (Release Management Rules)

每次发布新版本时，必须严格遵守以下规范：

1. **版本目录隔离**：
   - 打包产物必须输出在 `dist/release/v{VERSION}/` 独立子目录下（如 `dist/release/v1.1.0/`），严禁将不同版本的文件直接散乱平铺在 `dist/release/` 根目录。
2. **完整资产包含**：
   - 每个版本的子目录中必须包含：
     - `inkgist-v{VERSION}-standalone.zip` (Node 服务端独立运行包)
     - `inkgist-v{VERSION}-standalone.tar.gz` (Linux 运行包)
     - `inkgist-bookmarks-extension.zip` (浏览器扩展压缩包)
     - `inkgist-bookmarks-assistant.crx` (浏览器扩展安装包)
     - `checksums.txt` (全附件 SHA-256 校验和)
     - `release-notes.md` (配套的双语版本更新说明文档)
3. **版本号同步**：
   - 发布新版本前，必须在 `package.json` 中提升 `version`，提交并推送到 GitHub。
