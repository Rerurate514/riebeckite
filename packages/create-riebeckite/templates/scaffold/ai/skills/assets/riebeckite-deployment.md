# riebeckite-deployment checklist

- [ ] Identify provider, build command, output directory, public origin, and content source.
- [ ] Inspect the existing workflow and provider configuration.
- [ ] Keep credentials in the secret store and report secret names only.
- [ ] Verify external-content checkout order, permissions, and configured path when used.
- [ ] Preserve public URLs, redirects, locales, canonical URLs, and asset paths.
- [ ] Run `npm run check` and `npm run build`; inspect generated output.
- [ ] Verify public pages, assets, feeds or sitemap, and redirects after deployment.
- [ ] Report target, configuration, verification, and rollback route.
