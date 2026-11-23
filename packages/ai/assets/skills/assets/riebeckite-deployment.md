# Deployment checklist

- [ ] Identify provider, build command, output directory, public origin, and content source.
- [ ] Inspect the existing workflow and provider configuration.
- [ ] Confirm `dist/` contains the expected routes, assets, feeds, and redirects.
- [ ] Keep secrets in the provider store; report names only.
- [ ] For external content, verify checkout path, permissions, fetch order, and `content.directory`.
- [ ] Preserve base paths, locales, redirects, canonical URLs, assets, and cache headers.
- [ ] Run `npm run check`.
- [ ] Run `npm run build` and inspect the output.
- [ ] Deploy through the existing command or CI workflow.
- [ ] Verify the public origin, one deep link, assets, feeds/sitemap, and a redirect.
- [ ] Confirm unpublished content is not reachable.
- [ ] Record the previous deployment/artifact/revision as the rollback target.
- [ ] Report target, changes, verification, secret names, and rollback path.
