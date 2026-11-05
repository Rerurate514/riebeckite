# Riebeckite v0.0.39

Released 2026-11-05.

> **Breaking changes are included.** Read the migration notes before upgrading.

### Changed

- The development Bridge now serves the Obsidian-compatible `/__riebeckite/bridge/v1/page` endpoint from the same source and publication resolution used by `/source`, `/preview`, and `/publication`. Source paths resolve through one shared manifest lookup, every endpoint reports the same Bridge revision, and ambiguous sources are reported instead of being silently treated as missing.
  Packages: `@riebeckite/dev-inspector`

- **Breaking:** Render Excalidraw drawings to inline SVG during the build and remove the client-side renderer and the `lazy` option.
  Packages: `@riebeckite/plugin-excalidraw`
  Migration: Call `excalidraw()` without options, and run `puppeteer browsers install chrome-headless-shell` if the build reports a missing browser.

### Fixed

- Generated sites render page-specific titles, descriptions, canonical URLs, and Open Graph tags through the SEO plugin. The generated configuration no longer points at a missing `/ogp.png`, the `portfolio` preset generates its `/projects/` listing, and the `empty` preset explains how to add a theme and plugins. Scaffold next steps quote the project directory, and the docs preset samples use the documented sidebar order and table of contents headings.
  Packages: `create-riebeckite`, `@riebeckite/honox`

- Drawer navigation keeps its scroll position when it is reopened after SPA navigation instead of jumping back to the first focusable item.
  Packages: `@riebeckite/ui`

- Plugin pages replace content routes at the same public path, and a collapsed folder page is no longer overwritten by its own redirect. Scaffolded sites declare the runtime packages required by pnpm and Yarn PnP; existing sites must add `@riebeckite/node`, `@riebeckite/runtime`, and `@riebeckite/spa` explicitly. `riebeckite dev` no longer requires managed Bridge environment variables.
  Packages: `@riebeckite/core`, `@riebeckite/honox`, `@riebeckite/cli`, `create-riebeckite`

---

Full changelog: https://github.com/Rerurate514/riebeckite/blob/v0.0.39/CHANGELOG.md
Compare: https://github.com/Rerurate514/riebeckite/releases/tag/v0.0.39
