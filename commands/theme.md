---
description: 校验 Chobits Chii 主题并说明如何切换
argument-hint: "[verify|where|customize]"
---

用户请求：$ARGUMENTS

Chobits Chii 主题由本插件提供，位于 `${CLAUDE_PLUGIN_ROOT}/themes/`。

1. 运行 `node "${CLAUDE_PLUGIN_ROOT}/scripts/validate.mjs"`，把结果简要汇报给用户。
2. 如果本机有 `claude` 命令，再运行 `claude plugin validate "${CLAUDE_PLUGIN_ROOT}"`，把结果一并汇报。
3. 列出主题文件及 `name` / `base`，说明对应的 `/theme` 选项：
   - `Chobits Chii (Light)`
   - `Chobits Chii (Dark)`
4. 告诉用户输入 `/theme` 自行选择；不要声称已经替用户切换主题。
5. 如果用户想自定义，建议复制到 `~/.claude/themes/` 并改文件名与 `name`，避免与插件主题重名；保留 `base` 为 `light` 或 `dark`。
6. 如果用户问桌面端或背景色，说明本插件只覆盖终端 TUI；Claude Desktop 的 Code tab 需要单独的 mod，终端背景由终端模拟器决定。
