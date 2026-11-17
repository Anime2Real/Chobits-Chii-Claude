---
name: chobits-chii
description: Apply, verify, or customize the Chobits Chii themes (chii-light / chii-dark) in Claude Code.
---

# Chobits Chii theme

This plugin ships two Claude Code themes in `themes/`:

- `chii-light.json` — warm cream, warm ink, muted rose accents
- `chii-dark.json` — warm dark version

## Apply

1. Run `/theme` in Claude Code.
2. Pick **Chobits Chii (Light)** or **Chobits Chii (Dark)**.
3. Theme selection is interactive. Never claim the theme is active until the user confirms.

Claude Code lists themes contributed by installed plugins automatically. The plugin's theme files are read from `${CLAUDE_PLUGIN_ROOT}/themes/`.

## Customize

- Do not edit the installed plugin copy; plugin updates replace it.
- To keep local changes, copy a theme to `~/.claude/themes/` with a new filename and a new `name`, for example `chii-light-mine.json` with `"name": "Chii Light Mine"`.
- Keep `base` as `light` or `dark`; edit only `overrides`.
- Claude Code watches `~/.claude/themes/` and reloads changed files. If the directory did not exist when Claude Code started, restart once after creating it.
- Supported color values: `#rrggbb`, `#rgb`, `rgb(r,g,b)`, `ansi256(n)`, and `ansi:<name>`.

## Verify

From the plugin root:

```bash
node scripts/validate.mjs
claude plugin validate .
```

`claude plugin validate` is authoritative for the manifest and theme paths; `scripts/validate.mjs` checks the theme JSON values and marketplace entry.
