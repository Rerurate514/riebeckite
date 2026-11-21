---
name: riebeckite-site
description: Use when adding or editing pages, frontmatter, or internal links in a Riebeckite site.
riebeckiteVersion: "{{riebeckite-version}}"
---

<!-- riebeckite:content-source local -->

# Site content workflow

Read `references/guide.md` and use `assets/checklist.md` for every change.

1. Read `riebeckite.config.ts`, inspect neighbouring files in `{{content-directory}}/`, and preserve the project's established frontmatter and link conventions.
2. When MCP is connected, obtain `riebeckite_context`, `riebeckite_diagnostics`, and `riebeckite_links` before editing. Otherwise run `npm run check`.
3. Resolve an ambiguous link or source before changing it. Do not guess a target from its filename.
4. Keep content inside `{{content-directory}}/`; preserve unknown frontmatter keys and the original line-ending and Markdown style.
5. A new publicly published page needs `publish: true` unless this project deliberately uses another publishing strategy.
6. Check title, permalink, aliases, locale, visibility, embeds, and inbound links when a page is renamed, moved, or deleted.
7. Run `npm run check`; run `npm run build` when routing, configuration, assets, or publication state changed.
8. Report changed files, validation results, unresolved diagnostics, and any publication or link risk.
