# Configuration checklist

- [ ] Inspect `riebeckite.config.ts`, `package.json`, content directory, deployment files, and extensions.
- [ ] Identify the smallest setting that solves the need.
- [ ] Preserve unknown fields and unrelated configuration.
- [ ] Check route impact for directory, exclude, locale, base URL, and publish strategy changes.
- [ ] Keep secrets in environment or provider secret storage.
- [ ] Report secret names only.
- [ ] Run `npm exec riebeckite inspect config` when the resolved value is unclear.
- [ ] Run `npm run check`.
- [ ] Run `npm run build` when paths, routes, extensions, or output changed.
- [ ] Inspect the affected route, canonical URL, asset, or feed.
- [ ] Report the setting, reason, validation, and migration/deployment impact.
