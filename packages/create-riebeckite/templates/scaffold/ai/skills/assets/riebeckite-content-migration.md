# riebeckite-content-migration checklist

- [ ] Define the source set, transformation, expected routes, and rollback method.
- [ ] Inspect representative files and preserve unrelated frontmatter and Markdown.
- [ ] Use the documented frontmatter transformer or produce a dry run for custom work.
- [ ] Check links, embeds, aliases, redirects, locales, and publication before route-affecting changes.
- [ ] Apply a small reversible batch and record exclusions.
- [ ] Run `npm run check` after each batch and `npm run build` before completion.
- [ ] Inspect routes, redirects, publication state, and unresolved links.
- [ ] Report scope, route impact, validation, exclusions, and rollback path.
