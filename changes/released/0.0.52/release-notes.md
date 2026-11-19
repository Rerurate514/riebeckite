# Riebeckite v0.0.52

Released 2026-11-19.

> **Breaking changes are included.** Read the migration notes before upgrading.

### Changed

- The Table of Contents keeps its top rule again, so the component reads as a closed box in sidebar rails and inline placements. The plugin still separates stacked sections with its bottom rule alone; pass `borders: { blockStart: false }` to drop the top rule per placement.
  Packages: `@riebeckite/plugin-toc`

- The digital-garden preset widens its page container to 90rem, so the note sidebar, article, table of contents rail, header and footer sit in a roomier centered layout. The three-column reader layout appears from 80rem.
  Packages: `create-riebeckite`

- The blog preset reads like a publication: a sticky top bar, a home page that lists posts with dates, summaries, and tags, and articles with a centered title and date, tag chips, series navigation, and a sticky rail holding the author card, table of contents, and backlinks. The docs preset no longer copies the Riebeckite website homepage; its index entry renders in the documentation reading shell, and the table of contents rail is hidden when a page has no headings.
  Packages: `create-riebeckite`

- The starter preset places its file explorer inside the article grid, so the explorer, article and table of contents share one centered page container. The navigation no longer hugs the viewport edge, the table of contents sits beside the article instead of the page edge, and the header and footer align with the same container. The explorer and table of contents appear from 80rem; below that the article stays a single centered column.
  Packages: `create-riebeckite`

- The digital-garden preset moves recently added notes beside the note tree, the docs preset keeps its header visible while its reading rails scroll independently, and the showcase preset becomes a three-rail reference catalog. The portfolio preset now derives a project grid from `content/projects/`.
  Packages: `create-riebeckite`

- Themes no longer ship a Tailwind-style `@theme` block. Theme CSS now renders the same with or without Tailwind installed.
  Packages: `@riebeckite/theme-default`, `@riebeckite/theme-editorial`, `@riebeckite/theme-fieldnotes`, `@riebeckite/theme-folio`, `@riebeckite/theme-garden`, `@riebeckite/theme-gruvbox`, `@riebeckite/theme-minimal`, `@riebeckite/theme-module`, `@riebeckite/theme-rerurate`, `@riebeckite/theme-sakura`, `@riebeckite/theme-signal`, `@riebeckite/theme-technical`, `@riebeckite/theme-terminal`, `@riebeckite/theme-tokyonight`

- Localized sites now emit a `hreflang="x-default"` alternate pointing at the default-language page for every translation group with more than one language. The default-language URL is the canonical entry point for search engines and language-blind visitors.
  Packages: `@riebeckite/plugin-l10n`

- The docs preset shell renders the documentation sidebar once instead of twice. The desktop sidebar column is now the docs navigation drawer panel styled as a sticky column from 48rem, and the separate always-present mobile copy of the sidebar markup is gone, so every docs page ships roughly half the sidebar DOM (links and list items) it did before. Sites generated from earlier presets keep working; only sites that copied the shell layout into their own routes and styled it against the removed `aside.site-sidebar` need to re-adopt the new layout.
  Packages: `create-riebeckite`

- UI strings are now localizable through configuration. `ui.locale` pins the UI language independently of the content language, and `ui.labels` supplies language-specific overrides for the built-in interface strings — the table of contents heading and label, the sidebar navigation and its filter box, the search bar, series navigation, the local graph and garden explorer panels, the language switcher, the diff history, and collapse/expand announcements. Plugins resolve them through the new `useUiLabels()` hook, sites can extend the dictionary with their own keys, and sites without `ui` settings render exactly the same English strings as before.
  Packages: `@riebeckite/core`, `@riebeckite/ui`, `@riebeckite/plugin-toc`, `@riebeckite/plugin-navigation`, `@riebeckite/plugin-search`, `@riebeckite/plugin-series`, `@riebeckite/plugin-local-graph`, `@riebeckite/plugin-l10n`, `@riebeckite/plugin-diff`, `@riebeckite/plugin-garden-explorer`

### Removed

- **Breaking:** Remove the `showcase` scaffold preset. Editorial now lets sites align article titles, metadata, and ornaments left, center, or right.
  Packages: `create-riebeckite`, `@riebeckite/theme-editorial`
  Migration: Use another scaffold preset and add only the plugins and content your site needs.

### Fixed

- The properties panel keeps its value column wide enough for short values, so a tag no longer collapses into a narrow oval in the portfolio preset's reading rail.
  Packages: `@riebeckite/plugin-properties`

- Sidebar links highlight the current page on localized pages again. The active check strips the language prefix from both the link href and the current path, so pages in non-default languages receive the `rb-sidebar-navigation__link--active` class and `aria-current="page"` as before; collapsed branches under `autoExpandActive` also reopen on load. Single-language sites are unaffected.
  Packages: `@riebeckite/plugin-navigation`

- Aliases now work on localized sites and can claim the URL of a private note. Previously the conflict check compared raw alias paths across every language, so an English and a Japanese note declaring the same alias cancelled each other and only one redirect survived; unpublished notes also reserved their canonical URLs and silently blocked legit aliases. The plugin now orders itself after the `l10n` plugin when present, compares aliases in the final per-locale URL space, and skips ownership reservation for notes marked `private: true`, so localized sites emit one redirect per language and private URLs can be taken over.
  Packages: `@riebeckite/plugin-alias`

- Fix the website's content asset build script so its prebuild step actually runs: the direct-execution guard compared the helper module's own path instead of the entry script, so `prebuild` silently did nothing. The image build also moves out of `predev` into a background task started by the Vite dev server, so `pnpm dev` no longer waits about 14 seconds for it.

### Security

- Update the Vite development server dependency to a patched release that removes a critical request-handling vulnerability allowing arbitrary code execution.
  Packages: `@riebeckite/cli`, `@riebeckite/dev-inspector`, `@riebeckite/honox`

---

Full changelog: https://github.com/Rerurate514/riebeckite/blob/v0.0.52/CHANGELOG.md
Compare: https://github.com/Rerurate514/riebeckite/releases/tag/v0.0.52
