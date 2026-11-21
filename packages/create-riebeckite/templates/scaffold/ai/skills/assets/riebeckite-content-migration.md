# Content migration checklist

- [ ] Record the exact source set, transformation, exclusions, and rollback path.
- [ ] Inspect the project's frontmatter, link, and formatting conventions.
- [ ] Determine `filters.publishStrategy` and each affected page's visibility.
- [ ] Preserve unknown frontmatter keys and unrelated content.
- [ ] Use `@riebeckite/plugin-frontmatter-transformer` for supported bulk changes.
- [ ] If scripting, dry-run first and write only the declared source set.
- [ ] List old/new URLs, inbound links, embeds, aliases, and redirects.
- [ ] Apply one small reversible batch at a time.
- [ ] Run `npm run check` after each batch.
- [ ] Run `npm run build` before completion.
- [ ] Inspect routes, redirects, publication, feeds, sitemap, and unresolved links.
- [ ] Restore and replan at the first unexpected result.
- [ ] Report scope, exclusions, route impact, validation, and rollback path.
