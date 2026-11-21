# Content migration reference

## Plan before mutation

Write down the source glob or explicit file list, original and target values, expected public routes, and rollback method. Inspect representative files before a bulk operation; a migration must preserve frontmatter keys it does not own and Markdown outside its target fields.

Use `@riebeckite/plugin-frontmatter-transformer` when its documented transforms fit. For a custom transformation, produce a dry-run list first and keep changes reviewable in small batches.

## Treat routes as public contracts

| Change | Check before applying |
| --- | --- |
| Move, rename, or delete a file | inbound links, embeds, aliases, redirects, external URLs |
| Change `permalink`, locale, or publication | resulting routes, canonical URLs, localized counterparts |
| Change frontmatter taxonomy or dates | generated pages, feeds, queries, and related content |

Do not silently rewrite links that cannot be resolved with the project's current content source.

## Validate and recover

Run `npm run check` after every batch and `npm run build` before finishing. Inspect routes, redirects, publication state, and unresolved links. Stop and restore from version control or backup when the actual route set differs from the plan.
