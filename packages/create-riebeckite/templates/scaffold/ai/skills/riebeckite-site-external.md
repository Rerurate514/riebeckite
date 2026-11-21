---
name: riebeckite-site
description: Use when adding or editing pages, frontmatter, or internal links in a Riebeckite site with external content.
riebeckiteVersion: "{{riebeckite-version}}"
---

<!-- riebeckite:content-source external -->

# External site content workflow

Read `references/guide.md` and complete `assets/checklist.md`.

1. Read `riebeckite.config.ts`, inspect neighbouring content, and confirm the separate content repository before editing.
2. `content/` is git-ignored in this repository. Commit content changes in the content repository, not the site repository.
3. When MCP is connected, inspect context, diagnostics, and links before editing. Otherwise run `npm run check`.
4. Preserve frontmatter, Markdown conventions, and root-relative links. Resolve ambiguous targets rather than guessing.
5. Add `publish: true` for a newly published page unless this project uses a different explicit publishing policy.
6. Check title, permalink, aliases, locale, visibility, embeds, and inbound links for moves, renames, or deletion.
7. Run `npm run check`; run `npm run build` for routing, configuration, assets, or publication changes.
8. Report the repository changed, validation, unresolved diagnostics, and publication/link risk.
