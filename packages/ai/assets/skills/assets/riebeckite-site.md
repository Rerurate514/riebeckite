# Site content checklist

- [ ] Read `riebeckite.config.ts` and identify the resolved `{{content-directory}}/` path.
- [ ] Check `filters.publishStrategy` and the page's current visibility fields.
- [ ] Inspect neighbouring pages for frontmatter, link, and formatting conventions.
- [ ] Confirm the page's current Public Location with `npm exec riebeckite inspect content --list`.
- [ ] For a rename, move, alias, locale, or deletion, list inbound links, embeds, and redirects.
- [ ] Preserve unknown frontmatter keys and unrelated content.
- [ ] Add or update a redirect before removing a public URL.
- [ ] Run `npm run check`.
- [ ] Run `npm run build` when routing, configuration, assets, or publication changed.
- [ ] Inspect the affected route, redirect, metadata, and assets.
- [ ] Confirm no unintended page became public or private.
- [ ] Report changed files, validation results, and unresolved link or publication risk.
