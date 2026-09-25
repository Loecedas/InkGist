# Git 同步规则 (Git Sync Rules)

当用户发出“从GitHub同步”、“拉取更新”、“同步代码”等类似指令时，必须严格遵守以下行为准则：

1. **严禁产生本地 Merge Commit**：
   - 必须使用 `git pull --ff-only origin main`（仅快进），绝不能允许自动生成 `Merge branch ...` 之类的合并提交。
2. **工作区状态处理**：
   - 同步前先检查工作区状态（`git status`）。
   - 若本地有未提交的临时修改，应妥善处理（如暂存 `git stash` -> `git pull --ff-only` -> `git stash pop`），或者询问用户后再操作，避免覆盖或产生合并冲突。
3. **如无法 Fast-Forward**：
   - 如果本地与远程存在分叉无法快进，向用户明确说明分叉提交，绝不要直接使用 `git merge`。可提供 `git rebase origin/main` 或 `git reset --hard origin/main` 供用户确认选择。
