---
name: riebeckite-plugin-catalog
description: Use when deciding whether to add an official Riebeckite plugin or which plugin to add.
riebeckiteVersion: "{{riebeckite-version}}"
---

# Plugin selection workflow

Read `references/guide.md` and complete `assets/checklist.md`.

1. State the requested capability, affected content, and whether it needs build-time, browser, or server behavior.
2. Inspect `riebeckite.config.ts` and installed `@riebeckite/plugin-*` packages before proposing a dependency.
3. Consult the official catalog before writing a local implementation, using MCP `riebeckite_plugin_catalog` when available. Prefer one existing Plugin over custom code when it owns the requested behavior.
4. Compare candidates for their content syntax, generated routes or assets, browser/runtime requirements, and compatibility with installed Plugins.
5. Read the selected Plugin's reference before installing it; do not infer its API from its package name.
6. Install the package and register only the chosen factory in `plugins`. Keep its options minimal and explicit.
7. Run `npm run check` and `npm run build`; inspect affected pages or browser behavior when applicable.
8. Report the selected Plugin, rejected alternatives, configuration change, validation result, and any required content migration.
