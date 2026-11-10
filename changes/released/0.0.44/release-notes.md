# Riebeckite v0.0.44

Released 2026-11-09.

### Fixed

- Scaffolded sites now ship a `pnpm-workspace.yaml` that approves the packages pnpm 12 insists on building (esbuild, puppeteer, sharp), so the first `pnpm install` finishes instead of failing with `ERR_PNPM_IGNORED_BUILDS`.
  Packages: `create-riebeckite`

- The local graph and garden explorer stylesheets now import the graph styles from their own CSS. Builds no longer depend on `@riebeckite/graph` being hoisted into the site, so they resolve under pnpm's isolated `node_modules`.
  Packages: `@riebeckite/plugin-local-graph`, `@riebeckite/plugin-garden-explorer`

- OG images load satori and sharp only when a page needs them, and the standalone SSG bundle keeps `@riebeckite/og-image` external. A site-level `pnpm-workspace.yaml` is no longer read as the monorepo root, so sites using the og-image plugin build under both npm and pnpm.
  Packages: `@riebeckite/honox`, `@riebeckite/og-image`

---

Full changelog: https://github.com/Rerurate514/riebeckite/blob/v0.0.44/CHANGELOG.md
Compare: https://github.com/Rerurate514/riebeckite/releases/tag/v0.0.44
