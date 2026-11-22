---
name: riebeckite-content-migration
description: Use when changing frontmatter, paths, permalinks, links, or publication state across multiple Riebeckite content files.
riebeckiteVersion: "{{riebeckite-version}}"
---

# Content migration workflow

Read `references/guide.md` and complete `assets/checklist.md`.

1. Write down the exact source set, transformation, expected route changes, exclusions, and rollback method before editing content.
2. Inspect project conventions and representative files. Preserve unknown frontmatter keys, formatting, and all content outside the requested transformation.
3. Determine the publish strategy and current visibility of every affected page before changing frontmatter.
4. Prefer `@riebeckite/plugin-frontmatter-transformer` for supported bulk frontmatter changes. Do not write an unreviewed one-off rewrite script.
5. Treat moves, renames, permalink changes, aliases, locales, and publication changes as route-affecting. Find inbound links, embeds, redirects, and external references first.
6. Apply the smallest reversible batch. Record changed paths, skipped files, and the reason for each exclusion.
7. Run `npm run check` after each batch; run `npm run build` before completion.
8. Inspect the resulting routes, redirects, publication state, feeds, and unresolved links.
9. Stop and restore from version control or backup if results differ from the plan. Do not improvise a second migration to hide the first.
10. Report scope, transformation, exclusions, route impact, validation results, and the rollback path.
