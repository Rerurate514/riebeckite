---
name: riebeckite-site
description: Use when adding or editing pages, frontmatter, or internal links in a Riebeckite site.
riebeckiteVersion: "{{riebeckite-version}}"
---

<!-- riebeckite:content-source local -->

# Site content workflow

Read `references/guide.md` and use `assets/checklist.md` for every change.

1. Read `riebeckite.config.ts`, the resolved content directory, and two or three neighbouring pages before editing. Record the project's frontmatter, slug, link, and formatting conventions.
2. Check `filters.publishStrategy` and any per-page publishing fields. Do not assume `publish: true` is required when the project uses selective publishing.
3. When MCP is connected, obtain `riebeckite_context`, `riebeckite_diagnostics`, and `riebeckite_links` before editing. Otherwise run `npm run check` to establish a baseline.
4. Resolve an ambiguous link, embed, alias, or source before changing it. Use the resolved Public Location; never guess a target from a filename.
5. Keep content inside `{{content-directory}}/`; preserve unknown frontmatter keys and the original line endings and Markdown style.
6. Before renaming, moving, or deleting a page, find inbound links, embeds, aliases, redirects, locale variants, and external references.
7. Make the smallest edit. Keep unrelated content and generated output unchanged.
8. Run `npm run check`. Run `npm run build` when routing, configuration, assets, or publication state changed.
9. Inspect the resulting route, redirects, unpublished pages, and unresolved links. Stop and report if a public URL changed without an approved redirect.
10. Report changed files, validation results, unresolved diagnostics, and any publication or link risk.
