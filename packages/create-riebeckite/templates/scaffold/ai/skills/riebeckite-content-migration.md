---
name: riebeckite-content-migration
description: Use when changing frontmatter, paths, permalinks, links, or publication state across multiple Riebeckite content files.
riebeckiteVersion: "{{riebeckite-version}}"
---

# Content migration workflow

Read `references/guide.md` and complete `assets/checklist.md`.

1. Define the exact source set, transformation, expected route changes, and rollback method before editing content.
2. Inspect project conventions and sample files. Preserve unknown frontmatter keys, formatting, and content outside the requested transformation.
3. Prefer `@riebeckite/plugin-frontmatter-transformer` for supported bulk frontmatter changes; do not write an unreviewed one-off rewrite script.
4. Treat moves, renames, permalink changes, aliases, locales, and `publish` as route-affecting. Identify inbound links, embeds, redirects, and external references first.
5. Apply the smallest reversible batch. Keep a record of changed paths and any files intentionally excluded.
6. Run `npm run check` after each batch and `npm run build` before completion.
7. Inspect the resulting routes, redirects, publication state, and unresolved links. Restore from version control or backup if results differ from the plan.
8. Report scope, transformation, exclusions, route impact, validation results, and rollback path.
