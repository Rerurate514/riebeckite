# Changelog

All notable changes to Riebeckite are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and Riebeckite follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
from 1.0 onward. Before 1.0, minor releases may contain breaking changes.

This changelog is generated from `changes/`. Do not edit it by hand.

Release history in this file begins with 0.0.36. Earlier releases are available as Git tags and GitHub Releases.

## [Unreleased]

> **Breaking changes are included.** Read the migration notes before upgrading.

### Changed

- **Breaking:** Plugin UI strings now ship with the plugin that renders them, in English and Japanese. The UI follows the content language by default, `ui.locale` still pins it, and `ui.labels` overrides individual strings per plugin namespace, for example `ui.labels.search.ja.searchPlaceholder`. Sites no longer copy framework dictionaries into their config to get a translated interface.
  Packages: `@riebeckite/core`, `@riebeckite/ui`, `@riebeckite/plugin-toc`, `@riebeckite/plugin-navigation`, `@riebeckite/plugin-search`, `@riebeckite/plugin-series`, `@riebeckite/plugin-l10n`, `@riebeckite/plugin-local-graph`, `@riebeckite/plugin-diff`, `@riebeckite/plugin-garden-explorer`
  Migration: Replace `ui.labels.<language>.<key>` with `ui.labels.<plugin>.<language>.<key>`. If you build UI with `@riebeckite/ui`, declare labels with `defineUiLabels(namespace, { en, ja })` and read them with `useUiLabels(definition)`. `DEFAULT_UI_LABELS`, the flat `UiLabels` type, and `resolveUiLabels(language, labels)` are removed.

[Unreleased]: https://github.com/Rerurate514/riebeckite/compare/v0.2.0...HEAD

## [0.2.0] - 2026-11-23

> **Breaking changes are included.** Read the migration notes before upgrading.

### Added

- Added the `dataset` plugin, which exports the published content graph as versioned NDJSON files at build time. It writes `pages.ndjson`, `links.ndjson`, and `index.json` under a configurable `directory` (default `data`) from `manifest.discoverableEntries`, so unlisted, draft, and scheduled notes never appear, and links between non-discoverable notes are dropped. Page records also carry an `excerpt` (frontmatter `description` or body, 180 characters), a 4,000-character plain-text `body`, and the note `language` when localized. The `exclude` option drops slug paths and their descendants from every output. Output is deterministic and sorted, with no timestamps. The package also ships normative JSON Schema documents for the page, link, and index records (exported as `./schema/*.schema.json`), and the plugin's tests validate generated output against those schemas and the `index.json` record counts, so external consumers can validate the artifacts without depending on any Riebeckite package.
  Packages: `@riebeckite/plugin-dataset`

- Added `@riebeckite/mcp`, an MCP server for the local Riebeckite development Bridge. AI assistants can connect it to `riebeckite dev` (via the bridge token) to read build state, content, and diagnostics and to run mutation validation. It is a read-only adapter: creating or applying mutation plans still requires Riebeckite's explicit mutation capability and human approval.
  Packages: `@riebeckite/mcp`

- Added generated Skills for official Plugin selection, application components, bulk content migrations, and deployment. References and checklists now give task-specific guidance for each workflow, and `riebeckite skills sync` can update existing generated Skills after confirmation.
  Packages: `create-riebeckite`, `@riebeckite/cli`

- Added the `riebeckite_plugin_catalog` MCP tool, which searches the public npm registry for published `@riebeckite/plugin-*` packages by capability or package name. It is read-only, requires network access, and does not change local site state.
  Packages: `@riebeckite/mcp`

- Added `riebeckite ai setup`, which installs generated Skills, AI guidance, the MCP dependency, and the `content:lint` script in an existing project. Scaffolds now generate `AGENTS.md` alongside `RIEBECKITE_AI.md`. `riebeckite skills sync` now adds missing Skills and files instead of only updating existing Skills, and preserves the project's content directory, title, and locale.
  Packages: `create-riebeckite`, `@riebeckite/cli`

- New sites scaffolded with a deployment now register `deploy({ provider: "cloudflare-workers" })` in `riebeckite.config.ts`, so content redirects are emitted as Cloudflare Workers `_redirects` files on every build. The dependency is added to `package.json` automatically. For existing sites, `riebeckite deploy setup` now adds the same plugin entry (and the dependency) when the config does not register it yet, leaving any existing registration untouched.
  Packages: `create-riebeckite`, `@riebeckite/cli`

- Added the `riebeckite_mutation_plan` and `riebeckite_mutation_apply` MCP tools. Mutation remains opt-in through `RIEBECKITE_BRIDGE_MUTATION_TOKEN`; applying a plan still requires a human `riebeckite bridge approve <plan-id>` review.
  Packages: `@riebeckite/mcp`

- Added `riebeckite ai mcp --mutations`, which generates temporary Bridge mutation and approval tokens for the session. The approval token is stored in the git-ignored `.riebeckite/` directory so `riebeckite bridge approve` works without environment variables.
  Packages: `@riebeckite/cli`

- The development Bridge now exposes `context`, `schema`, `inventory`, `links`, and `content` endpoints, adds a `since` snapshot mode to `diagnostics`, and accepts `mutations/validate` under the normal Bridge token so clients can check mutation operations without creating an approvable plan. The preview, runtime, honox, diagnostics, and image-optimizer packages only consolidate internal module files; their published behavior is unchanged.
  Packages: `@riebeckite/dev-inspector`, `@riebeckite/preview`, `@riebeckite/runtime`, `@riebeckite/honox`, `@riebeckite/plugin-diagnostics`, `@riebeckite/plugin-image-optimizer`
  PR: https://github.com/Rerurate514/riebeckite/pull/16

- The development Bridge and MCP now expose project facts, last-build source impact, response evidence, and mutation plan inspection. The new `@riebeckite/ai` package owns AI configuration, Rules, Skills, and mutation boundaries through `integrations.ai.mutationPolicy`; protected paths override writable paths and are checked when plans are validated, saved, and applied.
  Packages: `@riebeckite/core`, `@riebeckite/ai`, `@riebeckite/dev-inspector`, `@riebeckite/honox`, `@riebeckite/mcp`

- Added project-local MCP client configuration to `riebeckite ai setup --client claude|cursor|vscode|opencode`, with merge behavior that preserves existing servers and never overwrites a `riebeckite` entry. Setup now writes `CLAUDE.md` and `.github/copilot-instructions.md`, records the Riebeckite version in `RIEBECKITE_AI.md`, and uses the detected npm or pnpm commands. `riebeckite doctor` reports incomplete AI guidance, outdated rules or Skills, and a missing MCP dependency.
  Packages: `@riebeckite/ai`, `@riebeckite/cli`, `@riebeckite/diagnostics`, `create-riebeckite`

### Changed

- The `alias` plugin now declares a `developmentRouteCache` contract, so the development server persists alias routes and restores them across dev-server restarts instead of recomputing them every time. The serialized route state is versioned as `alias-route-v1` and is invalidated automatically when the format changes.
  Packages: `@riebeckite/plugin-alias`

- Added shared content-projection helpers — `isExcludedSlugPath`, `getEntryPlainText`, `createEntryExcerpt`, and `extractHtmlHeadings` — so plugins no longer carry private copies of the discovery exclude check, the excerpt fallback, and the heading extraction. Existing behavior is unchanged; the helpers are now the single source of those projections across plugins.
  Packages: `@riebeckite/core`

- The taxonomy exclude check now delegates to the shared `isExcludedSlugPath` helper in `@riebeckite/core`, keeping the exact-match-and-descendants semantics in one place instead of a plugin-private copy. Behavior is unchanged; excluded slug paths are still dropped from every taxonomy view.
  Packages: `@riebeckite/plugin-taxonomy`

- The garden explorer now builds its note projections with the shared `@riebeckite/core` helpers (`isExcludedSlugPath`, `createEntryExcerpt`, `extractHtmlHeadings`, `getEntryPlainText`) instead of plugin-private copies. Behavior is unchanged, and note bodies now respect a cached `plainText` when the content format provides one.
  Packages: `@riebeckite/plugin-garden-explorer`

- The folder-pages exclude check now delegates to the shared `isExcludedSlugPath` helper in `@riebeckite/core` instead of a plugin-private copy. Behavior is unchanged; excluded slug paths and their descendants are still omitted from folder pages.
  Packages: `@riebeckite/plugin-folder-pages`

- The navigation exclude check now delegates to the shared `isExcludedSlugPath` helper in `@riebeckite/core` instead of a plugin-private copy. Behavior is unchanged; excluded slug paths and their descendants are still omitted from the navigation tree.
  Packages: `@riebeckite/plugin-navigation`

- The search index now builds its headings and excerpts with the shared `createEntryExcerpt` and `extractHtmlHeadings` helpers from `@riebeckite/core` instead of plugin-private copies. Behavior is unchanged and every language is still indexed.
  Packages: `@riebeckite/plugin-search`

- Memoized the shared plain-text projection so repeated consumers within one build reuse one computation per entry. `getEntryPlainText` now caches the derived text on the frozen manifest entry, so plugins that each project the same notes (search, the garden explorer, and the dataset) compute the HTML-to-text conversion once instead of once per consumer. Output is unchanged; manifest entries are immutable, and rebuilds create new entry objects with fresh caches.
  Packages: `@riebeckite/core`

- Expanded the generated Skill guides and checklists with concrete examples, exact commands, failure symptoms, and reporting templates. Added the missing Plugin `global` cache mode and corrected the upgrade Skill to describe `riebeckite upgrade` as a preflight check rather than an install. `riebeckite skills sync` picks up the expanded content when updates are accepted.
  Packages: `create-riebeckite`, `@riebeckite/cli`

- Development route-cache fingerprints now use content source metadata (`modifiedAt` and `size`) instead of rereading and hashing every file, so a warm dev-server start no longer re-reads the whole vault. The route cache version was bumped, so existing saved state is recomputed once. Plugins that participate in development route caching through content locations, localization, or route manifest hooks must now declare `developmentRouteCache`; a missing descriptor fails startup with an error naming the plugin instead of silently disabling the cache. The `permalink` plugin and the plugin generator's `urls` template now declare this contract.
  Packages: `@riebeckite/core`, `@riebeckite/plugin-permalink`, `@riebeckite/cli`

- `riebeckite dev` now shows a progress indicator while the site becomes reachable: the elapsed time of each startup phase (loading the config, starting the Vite dev server, preparing the first page) and a `Ready` line once the development server answers its first request. The indicator only runs for interactive `riebeckite dev`; managed development sessions and `riebeckite ai mcp` keep their existing machine-readable output.

  The warmer is now built into the HonoX integration's Vite plugin and enabled by default (`warmContent` defaults to true). After the dev server listens, the first page is requested so the content graph and SSR render finish during startup. While it is being prepared, `riebeckite:` progress lines appear every five seconds; the Vite URL banner and `printUrls` output are held back until the first response, so the local URL appears only once the site is actually reachable. Sites that run dev servers where no local URL can be resolved fall back to warming the content manifest only. Set `warmContent: false` in `riebeckiteVite()` to opt out.
  Packages: `@riebeckite/cli`, `@riebeckite/honox`

- **Breaking:** Replaced the drawer's self-initializing side-effect import with an explicit `initDrawers({ signal })` API (preset scaffolds and website already rewired, `:target` フォールバックや `data-rb-*` プロトコルは不変). code-tabs is now a hooks island: one SSR-hydrated `CodeTabsGroup` component via `hydrateRoot`, a `data-code-tabs-props` payload with sanitizer support, and a cache version bump to v3. Removed the dead `./tabs` export from `@riebeckite/ui` (createTabs) and the provably-dead `spa:navigation` listener in source-files. Fixed the local-graph hydration payload to `{ graph, showExplorerLink }` so the explorer link survives hydration. Added the interactive-roots decision guide (hydrateRoot vs createRoot) and refreshed the UI docs accordingly.
  Packages: `@riebeckite/ui`, `@riebeckite/plugin-code-tabs`, `@riebeckite/plugin-source-files`, `@riebeckite/plugin-local-graph`, `create-riebeckite`
  Migration: Replace `import \"@riebeckite/ui/drawer/client\"` with an explicit `initDrawers({ signal })` call inside the page initializer. Migrate code-tabs off `CodeTabsClientOptions` to the new `initCodeTabs()` client export (cache key becomes `code-tabs-v3`). Users importing `@riebeckite/ui/tabs` must move to the code-tabs island or their own implementation.

- Content migration plans now reject malformed diagnostics, conflicts, selections, and skipped records instead of accepting them through type casts. Diagram and embed plugins also validate their incoming options with shared guards rather than unchecked casts. Core also exports the RiebeckiteIntegrations type and new VFile diagnostic helpers for plugin authors.
  Packages: `@riebeckite/core`, `@riebeckite/node`, `@riebeckite/diagram`, `@riebeckite/plugin-bases`, `@riebeckite/plugin-canvas`, `@riebeckite/plugin-d2`, `@riebeckite/plugin-dataview`, `@riebeckite/plugin-flashcards`, `@riebeckite/plugin-frontmatter-transformer`, `@riebeckite/plugin-graphviz`, `@riebeckite/plugin-map`, `@riebeckite/plugin-markmap`, `@riebeckite/plugin-marp`, `@riebeckite/plugin-mermaid`, `@riebeckite/plugin-mermaid-pele`, `@riebeckite/plugin-plantuml`, `@riebeckite/plugin-qr-code`, `@riebeckite/plugin-rich-embed`, `@riebeckite/plugin-vega-lite`, `@riebeckite/plugin-wavedrom`

### Removed

- **Breaking:** Removed the unused `spa()` helper from `@riebeckite/spa`. SPA navigation is configured through the `spa` key in `riebeckite.config.ts`, and the helper never affected the runtime, so existing sites behave the same.
  Packages: `@riebeckite/spa`
  Migration: Replace `spa({ ... })` with the options object itself: `spa: { ... }` in `riebeckite.config.ts`.

### Fixed

- The sandboxed iframe runtime's guest bridge script lost its sandbox handshake: the bridge document was generated with `export function send` inside a plain script, so the script failed with a syntax error, the guest never answered the init handshake, and every `createIframeRuntime` mount stalled until its start timeout. The bridge is now emitted with a plain function declaration again, so iframe runtimes become ready and respond to invocations.
  Packages: `@riebeckite/runtime`

[0.2.0]: https://github.com/Rerurate514/riebeckite/compare/v0.1.0...v0.2.0

## [0.1.0] - 2026-11-19

### Changed

- The Honox Vite plugin starts dev servers about a second sooner by resolving the Riebeckite application in parallel with Vite's own startup instead of awaiting it inside the config hook. Serve mode fires the resolution without blocking the listen step and every request-time hook awaits it on entry, while build mode still resolves synchronously in the config phase, so generated sites behave exactly as before.
  Packages: `@riebeckite/cli`, `@riebeckite/honox`

- The Honox integration and the development inspector load most of their module graph lazily, and the bundled Riebeckite config is cached on disk under `.riebeckite/config-bundle`, so dev servers start several seconds sooner. Import edges to `@riebeckite/core`, `@riebeckite/node`, `@riebeckite/diagnostics` and other heavy dependencies now resolve inside the functions that need them, which keeps every public signature unchanged. The config bundle cache is keyed by the resolved config file path, the esbuild version, and content digests of every bundled input plus the workspace package manifests, and it rebuilds automatically whenever any recorded input changes.
  Packages: `@riebeckite/cli`, `@riebeckite/honox`, `@riebeckite/dev-inspector`

### Fixed

- `richEmbed()` again renders `youtu.be` short links. The provider allow-list was missing the `youtu.be` host, so those URLs were reported as unsupported and stayed as plain code blocks even though the README lists them as supported.
  Packages: `@riebeckite/plugin-rich-embed`

[0.1.0]: https://github.com/Rerurate514/riebeckite/compare/v0.0.52...v0.1.0

## [0.0.52] - 2026-11-19

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

[0.0.52]: https://github.com/Rerurate514/riebeckite/compare/v0.0.51...v0.0.52

## [0.0.51] - 2026-11-17

> **Breaking changes are included.** Read the migration notes before upgrading.

### Added

- Cache verified development route metadata between process restarts, including supported plugin route state, to reduce startup work for unchanged content.
  Packages: `@riebeckite/core`, `@riebeckite/plugin-l10n`, `@riebeckite/plugin-breadcrumbs`

- Preview the current page's Open Graph image in the OG images Development Inspector tab. The development server renders deferred plugin images on demand instead of leaving them to the static build.
  Packages: `@riebeckite/honox`, `@riebeckite/plugin-og-image`

### Changed

- Mermaid diagrams line up with the article text. The plugin's figure kept the browser's default 40px side margins because the framework only sets the block margins on figures, and the diagram was centered inside its canvas, so every diagram sat narrower and indented compared with the surrounding text.
  Packages: `@riebeckite/plugin-mermaid-pele`

- **Breaking:** Packages that interoperate with the site Core now use the site's single Core instance instead of installing a nested copy. This prevents incompatible plugin, theme, integration, and CLI contract instances.
  Packages: `@riebeckite/cli`, `@riebeckite/dev-inspector`, `@riebeckite/diagnostics`, `@riebeckite/diagram`, `@riebeckite/honox`, `@riebeckite/node`, `@riebeckite/plugin-alias`, `@riebeckite/plugin-analytics`, `@riebeckite/plugin-archive`, `@riebeckite/plugin-article-metadata`, `@riebeckite/plugin-attachment`, `@riebeckite/plugin-autocardlink`, `@riebeckite/plugin-backlinks`, `@riebeckite/plugin-bases`, `@riebeckite/plugin-breadcrumbs`, `@riebeckite/plugin-calculator`, `@riebeckite/plugin-canvas`, `@riebeckite/plugin-changelog`, `@riebeckite/plugin-chartjs`, `@riebeckite/plugin-citations`, `@riebeckite/plugin-code-annotations`, `@riebeckite/plugin-code-enhance`, `@riebeckite/plugin-code-tabs`, `@riebeckite/plugin-color-mode`, `@riebeckite/plugin-d2`, `@riebeckite/plugin-daily-notes`, `@riebeckite/plugin-dataview`, `@riebeckite/plugin-deploy`, `@riebeckite/plugin-diagnostics`, `@riebeckite/plugin-diff`, `@riebeckite/plugin-discord-embed`, `@riebeckite/plugin-docs`, `@riebeckite/plugin-excalibrain`, `@riebeckite/plugin-excalidraw`, `@riebeckite/plugin-flashcards`, `@riebeckite/plugin-folder-pages`, `@riebeckite/plugin-frontmatter-transformer`, `@riebeckite/plugin-gallery`, `@riebeckite/plugin-garden-explorer`, `@riebeckite/plugin-glossary`, `@riebeckite/plugin-graphviz`, `@riebeckite/plugin-hard-breaks`, `@riebeckite/plugin-highlight`, `@riebeckite/plugin-hover-preview`, `@riebeckite/plugin-icons`, `@riebeckite/plugin-image-compare`, `@riebeckite/plugin-image-optimizer`, `@riebeckite/plugin-kanban`, `@riebeckite/plugin-l10n`, `@riebeckite/plugin-lightbox`, `@riebeckite/plugin-local-graph`, `@riebeckite/plugin-map`, `@riebeckite/plugin-markmap`, `@riebeckite/plugin-marp`, `@riebeckite/plugin-mdx`, `@riebeckite/plugin-media`, `@riebeckite/plugin-mermaid`, `@riebeckite/plugin-mermaid-pele`, `@riebeckite/plugin-meta-bind`, `@riebeckite/plugin-navigation`, `@riebeckite/plugin-obsidian-markdown`, `@riebeckite/plugin-og-image`, `@riebeckite/plugin-pdf`, `@riebeckite/plugin-permalink`, `@riebeckite/plugin-plantuml`, `@riebeckite/plugin-properties`, `@riebeckite/plugin-qr-code`, `@riebeckite/plugin-quality`, `@riebeckite/plugin-query`, `@riebeckite/plugin-recent-posts`, `@riebeckite/plugin-related-posts`, `@riebeckite/plugin-rename`, `@riebeckite/plugin-responsive-image`, `@riebeckite/plugin-rich-embed`, `@riebeckite/plugin-search`, `@riebeckite/plugin-seo`, `@riebeckite/plugin-series`, `@riebeckite/plugin-share`, `@riebeckite/plugin-shortcodes`, `@riebeckite/plugin-sidenotes`, `@riebeckite/plugin-source-files`, `@riebeckite/plugin-svg-optimizer`, `@riebeckite/plugin-taxonomy`, `@riebeckite/plugin-text-fragment`, `@riebeckite/plugin-timeline`, `@riebeckite/plugin-toc`, `@riebeckite/plugin-ux`, `@riebeckite/plugin-vault-heatmap`, `@riebeckite/plugin-vega-lite`, `@riebeckite/plugin-wavedrom`, `@riebeckite/plugin-webmention`, `@riebeckite/preview`, `@riebeckite/runtime`, `@riebeckite/theme-default`, `@riebeckite/theme-editorial`, `@riebeckite/theme-fieldnotes`, `@riebeckite/theme-folio`, `@riebeckite/theme-garden`, `@riebeckite/theme-gruvbox`, `@riebeckite/theme-minimal`, `@riebeckite/theme-module`, `@riebeckite/theme-rerurate`, `@riebeckite/theme-sakura`, `@riebeckite/theme-signal`, `@riebeckite/theme-technical`, `@riebeckite/theme-terminal`, `@riebeckite/theme-tokyonight`, `@riebeckite/ui`
  Migration: Move @riebeckite/core from dependencies to peerDependencies and devDependencies in external packages. Install one compatible @riebeckite/core in the site that loads the package.

### Fixed

- The docs preset leaves the same space below the previous and next documentation links as the Riebeckite website. The preset had the spacing rule under the class name the website's own article component uses, so a generated docs site ran the links into the site footer with no gap. The "Powered by Riebeckite" line also picks up the muted small-print styling the other presets give it.
  Packages: `create-riebeckite`

[0.0.51]: https://github.com/Rerurate514/riebeckite/compare/v0.0.50...v0.0.51

## [0.0.50] - 2026-11-16

### Changed

- Link preview cards now keep a fixed height of eight em and limit the image to half of the card width, so cards line up in a list the way Obsidian shows them instead of changing height with the image and description. Cards with an unlimited description grow to fit their text, and narrow containers hide the description below 500px and the image below 300px instead of stacking them.
  Packages: `@riebeckite/plugin-autocardlink`

### Fixed

- The development server now answers requests for images that plugins generate during the build, such as the WebP and AVIF variants of the image optimizer. The page already rendered `<picture>` sources for those variants, so every request for a variant returned 404 in development and the browser showed broken images; the server reads the generated bytes from the content manifest instead of looking for a file next to the source image. AVIF responses also carry the correct content type.
  Packages: `@riebeckite/honox`

[0.0.50]: https://github.com/Rerurate514/riebeckite/compare/v0.0.49...v0.0.50

## [0.0.49] - 2026-11-15

### Fixed

- The development inspector registers its bridge middleware before other Vite plugins, so the bridge endpoint answers first when another plugin also handles the same request.
  Packages: `@riebeckite/dev-inspector`

- Rebuilding a package removes its previous output directory first, so a published package no longer carries build files left behind by earlier builds. `@riebeckite/cli` 0.0.48 shipped hundreds of unreferenced chunk files that made the unpacked package about 25 MB larger than the built output.
  Packages: `@riebeckite/cli`

- The graph renderer no longer throws while it is created. Its camera, drawing, and animation controllers now receive the renderer context when they are created, so resizing, updating, zooming, and drawing use that context instead of a missing argument. Local graphs and the garden explorer draw again instead of leaving an empty canvas.
  Packages: `@riebeckite/graph`

[0.0.49]: https://github.com/Rerurate514/riebeckite/compare/v0.0.48...v0.0.49

## [0.0.48] - 2026-11-15

> **Breaking changes are included.** Read the migration notes before upgrading.

### Added

- Add `navigation({ exclude })` to omit slug paths and their descendants from derived navigation.
  Packages: `@riebeckite/plugin-navigation`
  ADR: https://github.com/Rerurate514/riebeckite/blob/main/docs/agents/adr/20261111-100000-navigation-exclude-73be42.md

- Add the `maxLine` option to control the number of visible description lines in link preview cards. Set it to `null` to show the full description. Add `showCopyButton` to hide the URL copy button when it is not needed.
  Packages: `@riebeckite/plugin-autocardlink`

- Add `exclude` to taxonomy, folder pages, and garden explorer to omit slug paths and their descendants from their derived discovery data.
  Packages: `@riebeckite/plugin-taxonomy`, `@riebeckite/plugin-folder-pages`, `@riebeckite/plugin-garden-explorer`
  ADR: https://github.com/Rerurate514/riebeckite/blob/main/docs/agents/adr/20261111-110000-discovery-projection-exclude-a7c91e.md

- Add a generic Content Format contract so plugins can contribute extensions, content processing, renderer modules, and tracked file dependencies, and add `@riebeckite/plugin-mdx` for trusted MDX pages whose JSX, expressions, ESM imports, and local components render through the Hono JSX runtime in development SSR and production SSG. Bare imports from content outside the site directory resolve against the site, and MDX file additions and removals reload the development server. Asset inspection, the Content Graph, and content queries read the active content formats, and MDX pages expose a static syntax-tree projection to search, excerpts, and headings that keeps Markdown structure while excluding frontmatter, ESM declarations, expressions, and JSX attributes.
  Packages: `@riebeckite/core`, `@riebeckite/honox`, `@riebeckite/ui`, `@riebeckite/plugin-mdx`, `create-riebeckite`

- Add declarative Markdown components (`markdownComponents`) that render from Markdown fences and MDX JSX through one registry, with server rendering, JSON-safe props, lazy client hydration, SPA-safe lifecycle cleanup, and automatic MDX integration. Code-enhance's copy button uses the new API, and the starter scaffold includes Markdown and MDX component examples.
  Packages: `@riebeckite/core`, `@riebeckite/honox`, `@riebeckite/plugin-code-enhance`, `create-riebeckite`

- Text attachments such as `.txt`, `.log`, and `.json` are embedded as an escaped code block preview with the file name, format, size, and download link below it. The new `preview` option selects which extensions preview, and files over 256 KiB, binary files, and invalid UTF-8 keep the existing attachment card.
  Packages: `@riebeckite/plugin-attachment`

- When SPA navigation is enabled, the build now reports an error diagnostic for every generated HTML page that lacks `<main id="main-content">`. Redirect pages are skipped. `riebeckite check` fails on these diagnostics by default.
  Packages: `@riebeckite/honox`

- Expose `collectWorkspacePackageClosure` from the E2E helpers so external-site tests pack the full workspace dependency closure of the packages under test, keeping packed tarballs installable without manual dependency lists.
  Packages: `@riebeckite/test`

### Changed

- **Breaking:** Align the public API types with the values the runtime actually produces, and replace the places that hid errors behind a double type assertion with validation. `@riebeckite/core` gains `parseYaml` for YAML parsing and fixture builders for content manifests and plugin contexts. `ClientRuntimeInvokeOptions.capability` is now typed as `RuntimeCapability`, `JsonValue` accepts readonly arrays and `undefined` property values, and defaulted options and arguments of `defineCliCommand` are typed with the accepted values instead of the default literal. `@riebeckite/node` reports a corrupt migration plan as `The migration plan is missing or corrupt.` instead of failing with an internal error.
  Packages: `@riebeckite/core`, `@riebeckite/runtime`, `@riebeckite/node`
  Migration: `ClientRuntimeInvokeOptions.capability` only accepts the values listed in `RuntimeCapability`. Code that reads `JsonValue` must handle `undefined` property values. Defaulted options and arguments of `defineCliCommand` are typed with every accepted value, so check the annotations that assumed the default literal.

- **Breaking:** Remove the duplicate UX TOC scroll spy so `@riebeckite/plugin-toc` is the sole owner of TOC active state.
  Packages: `@riebeckite/plugin-ux`
  Migration: Remove `tocScrollSpy` from `ux()`. Use `toc()` and `TableOfContents` for TOC scroll tracking.

- **Breaking:** Separate the three plugin extension mechanisms by responsibility. `PluginSiteComponent` is a JSX component the site places, `markdownComponents` renders HTML from Markdown fences and MDX with optional client hydration, and `hastTransforms` transforms sanitized document nodes without a client entry. Duplicate names are checked separately for Markdown components and HAST transforms, so both may use the same name. The diff plugin renders its history, viewer, panel, and lines with Hono JSX while keeping the existing string-returning public functions as boundaries.

  | Old | New |
  | --- | --- |
  | `PluginComponent` | `PluginSiteComponent` |
  | `definePluginComponent` | `defineMarkdownComponent` |
  | `PluginComponentClient` | `PluginMarkdownComponentClient` |
  | `PluginComponentResolveContext` | `PluginMarkdownComponentResolveContext` |
  | `components` | `markdownComponents` |
  | `PluginHastComponent` | `PluginHastTransform` |
  | `defineHastComponent` | `defineHastTransform` |
  | `hastComponents` | `hastTransforms` |
  | `preparePluginComponent` | `prepareMarkdownComponent` |
  | `PreparedPluginComponent` | `PreparedMarkdownComponent` |
  | `renderPluginComponents` | `renderMarkdownComponents` |
  | `renderHastComponents` | `renderHastTransforms` |
  | `replaceHastComponents` | `replaceHastTransforms` |
  | `finalizeDeferredPluginComponents` | `finalizeDeferredMarkdownComponents` |
  | `codeTabsHastComponent` | `codeTabsTransform` |
  Packages: `@riebeckite/core`, `@riebeckite/honox`, `@riebeckite/cli`, `@riebeckite/plugin-backlinks`, `@riebeckite/plugin-breadcrumbs`, `@riebeckite/plugin-changelog`, `@riebeckite/plugin-code-enhance`, `@riebeckite/plugin-code-tabs`, `@riebeckite/plugin-diff`, `@riebeckite/plugin-docs`, `@riebeckite/plugin-image-compare`, `@riebeckite/plugin-l10n`, `@riebeckite/plugin-local-graph`, `@riebeckite/plugin-properties`, `@riebeckite/plugin-related-posts`, `@riebeckite/plugin-series`, `@riebeckite/plugin-share`, `@riebeckite/plugin-webmention`
  Migration: Replace PluginComponent with PluginSiteComponent and definePluginComponent with defineMarkdownComponent. Rename the plugin manifest field components to markdownComponents, and hastComponents to hastTransforms. Replace PluginHastComponent with PluginHastTransform and defineHastComponent with defineHastTransform. HAST transforms no longer accept a client entry. The public names preparePluginComponent, PreparedPluginComponent, renderPluginComponents, renderHastComponents, replaceHastComponents, and finalizeDeferredPluginComponents are renamed to their Markdown/HAST-specific equivalents. The code-tabs export codeTabsHastComponent is now codeTabsTransform.

- **Breaking:** Replace the positional `createClientEntry` signature with a single options object. Client entries can set `root: "document"` when their presence marker lives in the site shell, receive the matched marker as `context.marker`, and app-scoped conditional entries are re-evaluated after SPA navigation.
  Packages: `@riebeckite/core`, `@riebeckite/honox`, `@riebeckite/cli`, `@riebeckite/plugin-search`
  Migration: Replace the positional createClientEntry arguments with an options object: createClientEntry(\"name\", { moduleSpecifier, exportName, publicConfig, scope, initializerArguments, presenceSelector, root, runtimeEntries }). Set root: \"document\" for a page entry whose presence marker is outside main#main-content.

- Restructure oversized source files into per-feature modules. The published module layout changes, but the behavior and the public API are unchanged.
  Packages: `@riebeckite/diagram`, `@riebeckite/diagnostics`, `@riebeckite/preview`, `@riebeckite/analytics-cloudflare`, `@riebeckite/plugin-analytics`, `@riebeckite/plugin-bases`, `@riebeckite/plugin-calculator`, `@riebeckite/plugin-canvas`, `@riebeckite/plugin-citations`, `@riebeckite/plugin-d2`, `@riebeckite/plugin-dataview`, `@riebeckite/plugin-diagnostics`, `@riebeckite/plugin-excalibrain`, `@riebeckite/plugin-excalidraw`, `@riebeckite/plugin-frontmatter-transformer`, `@riebeckite/plugin-graphviz`, `@riebeckite/plugin-icons`, `@riebeckite/plugin-image-optimizer`, `@riebeckite/plugin-markmap`, `@riebeckite/plugin-meta-bind`, `@riebeckite/plugin-marp`, `@riebeckite/plugin-mermaid`, `@riebeckite/plugin-obsidian-markdown`, `@riebeckite/plugin-permalink`, `@riebeckite/plugin-quality`, `@riebeckite/plugin-rich-embed`, `@riebeckite/plugin-sidenotes`, `@riebeckite/plugin-source-files`, `@riebeckite/plugin-vega-lite`, `@riebeckite/plugin-wavedrom`

### Fixed

- Derived View results and content cache entries are now reused only when they survive a JSON round trip, so sparse arrays, negative zero, cyclic values, and dates inside frontmatter arrays no longer change when a cache hit is served. The Markdown sanitize fingerprint now distinguishes regular expressions in the schema, and the rename plugin ignores a corrupt persisted route lock instead of diffing against it.
  Packages: `@riebeckite/core`, `@riebeckite/plugin-rename`

- Match `exclude` against logical content slugs so localized pages are filtered independently, keep authored calendar dates instead of UTC dates, fall back to the next valid date field when `published` is not a date, include notes dated only by `published` in Recent Posts, and center article-layout page bodies again.
  Packages: `@riebeckite/core`, `@riebeckite/honox`, `@riebeckite/plugin-article-metadata`, `@riebeckite/plugin-folder-pages`, `@riebeckite/plugin-garden-explorer`, `@riebeckite/plugin-navigation`, `@riebeckite/plugin-recent-posts`, `@riebeckite/plugin-seo`, `@riebeckite/plugin-taxonomy`, `@riebeckite/plugin-timeline`

- Content mutations now retry when Windows reports that a content file is in use, so an apply no longer fails with EPERM while another process is reading the same file. Stale lock reclamation is serialized through a guard file and removes the stale lock directly, so two processes can no longer both believe they hold the lock.
  Packages: `@riebeckite/node`

- Content mutations and migrations now verify lock ownership before journal and content writes, so a process that lost its lock cannot overwrite or delete state owned by another process. Stale-lock reclamation removes a lock or guard only when its content still matches the stale copy it inspected, and apply preserves files that are created, replaced, or deleted between verification and the write.
  Packages: `@riebeckite/node`

- Content mutations now fail with a clear error when the filesystem does not support hard links, instead of falling back to a rename that could overwrite a file another process created between verification and the write. Filesystems without hard-link support, such as FAT volumes, can no longer apply mutations that create or replace files.
  Packages: `@riebeckite/node`

- MDX content now produces correctly decoded plain text for search, excerpts, and headings, and the doctor no longer reports components imported by MDX as unused assets. Incremental SSG keeps navigation and recent-post projections reusable when only an MDX body changes, while still regenerating them when projected entries change. Link updates, provenance, source lookups, and the development inspector resolve non-Markdown content formats through the shared content format registry, and standalone SSG no longer loads its bundle twice when renderer chunks import it.
  Packages: `@riebeckite/core`, `@riebeckite/cli`, `@riebeckite/node`, `@riebeckite/dev-inspector`, `@riebeckite/honox`, `@riebeckite/plugin-mdx`, `@riebeckite/plugin-search`

- Load page-scoped client initializers when their presence marker exists anywhere in the document, so a search bar rendered in the site header outside `#main-content` mounts and opens its dialog again.
  Packages: `@riebeckite/honox`

- Initialize the table of contents from the document so the docs rail outside `#main-content` tracks scrolling again. The active state also rebinds after SPA navigation replaces the TOC region.
  Packages: `@riebeckite/plugin-toc`

- Decode HTML character references consistently through the shared `htmlToPlainText` helper. Numeric references such as `&#x3C;` no longer appear as raw entity text in table of contents titles, hover preview excerpts, garden explorer headings and bodies, SEO descriptions, taxonomy summaries, or map attribution.
  Packages: `@riebeckite/plugin-toc`, `@riebeckite/plugin-hover-preview`, `@riebeckite/plugin-garden-explorer`, `@riebeckite/plugin-seo`, `@riebeckite/plugin-taxonomy`, `@riebeckite/plugin-map`

### Security

- Update Hono to 4.13.18 and `@hono/node-server` to 2.1.8 to remove advisories for mount and wildcard middleware bypasses, CSRF and validator bypasses, unescaped `css` helper output, unsafe WebSocket upgrade handling, and backslash path parsing.
  Packages: `@riebeckite/cli`, `@riebeckite/graph`, `@riebeckite/honox`, `@riebeckite/og-image`, `@riebeckite/plugin-article-metadata`, `@riebeckite/plugin-backlinks`, `@riebeckite/plugin-breadcrumbs`, `@riebeckite/plugin-changelog`, `@riebeckite/plugin-code-enhance`, `@riebeckite/plugin-code-tabs`, `@riebeckite/plugin-color-mode`, `@riebeckite/plugin-daily-notes`, `@riebeckite/plugin-diff`, `@riebeckite/plugin-docs`, `@riebeckite/plugin-flashcards`, `@riebeckite/plugin-garden-explorer`, `@riebeckite/plugin-l10n`, `@riebeckite/plugin-lightbox`, `@riebeckite/plugin-local-graph`, `@riebeckite/plugin-navigation`, `@riebeckite/plugin-og-image`, `@riebeckite/plugin-properties`, `@riebeckite/plugin-recent-posts`, `@riebeckite/plugin-related-posts`, `@riebeckite/plugin-search`, `@riebeckite/plugin-series`, `@riebeckite/plugin-share`, `@riebeckite/plugin-text-fragment`, `@riebeckite/plugin-toc`, `@riebeckite/plugin-webmention`, `@riebeckite/ui`

[0.0.48]: https://github.com/Rerurate514/riebeckite/compare/v0.0.46...v0.0.48

## [0.0.46] - 2026-11-10

### Fixed

- Generated sites now emit a `404.html` page and configure `assets.not_found_handling` as `404-page`, so Cloudflare Workers serves the styled not-found page for unknown paths instead of the default response.
  Packages: `create-riebeckite`

[0.0.46]: https://github.com/Rerurate514/riebeckite/compare/v0.0.45...v0.0.46

## [0.0.45] - 2026-11-10

### Added

- Themes can declare an optional `palette` of `light` and `dark` background, foreground, and accent colors. The og-image plugin now uses the active theme's palette instead of a fixed navy default, so generated images match the site. `appearance` still overrides individual colors, and themes without a palette keep the previous default.
  Packages: `@riebeckite/core`, `@riebeckite/plugin-og-image`, `@riebeckite/theme-rerurate`

[0.0.45]: https://github.com/Rerurate514/riebeckite/compare/v0.0.44...v0.0.45

## [0.0.44] - 2026-11-09

### Fixed

- Scaffolded sites now ship a `pnpm-workspace.yaml` that approves the packages pnpm 12 insists on building (esbuild, puppeteer, sharp), so the first `pnpm install` finishes instead of failing with `ERR_PNPM_IGNORED_BUILDS`.
  Packages: `create-riebeckite`

- The local graph and garden explorer stylesheets now import the graph styles from their own CSS. Builds no longer depend on `@riebeckite/graph` being hoisted into the site, so they resolve under pnpm's isolated `node_modules`.
  Packages: `@riebeckite/plugin-local-graph`, `@riebeckite/plugin-garden-explorer`

- OG images load satori and sharp only when a page needs them, and the standalone SSG bundle keeps `@riebeckite/og-image` external. A site-level `pnpm-workspace.yaml` is no longer read as the monorepo root, so sites using the og-image plugin build under both npm and pnpm.
  Packages: `@riebeckite/honox`, `@riebeckite/og-image`

[0.0.44]: https://github.com/Rerurate514/riebeckite/compare/v0.0.43...v0.0.44

## [0.0.43] - 2026-11-09

### Added

- Add `maxSegmentLength` to `alias()` so sites can skip aliases whose percent-encoded path segments exceed their host or filesystem limits.
  Packages: `@riebeckite/plugin-alias`

### Changed

- Add border control to the Backlinks component, a three-column reader layout and folder navigation to the digital-garden preset, and remove marketing-site footer styles from the Rerurate theme.
  Packages: `@riebeckite/plugin-backlinks`, `@riebeckite/theme-rerurate`, `create-riebeckite`

### Fixed

- Resolve percent-encoded content permalinks and aliases from the decoded request path, so non-ASCII URLs work without a custom manifest lookup.
  Packages: `@riebeckite/honox`

- Reuse existing SSG output cache entries when a full regeneration produces identical content, instead of copying every output back into the cache on each build.
  Packages: `@riebeckite/honox`

- Ignore hashtags inside code blocks, inline code, links, wikilinks, and HTML attributes when extracting inline content tags so they no longer appear in taxonomy listings and search data.
  Packages: `@riebeckite/core`

[0.0.43]: https://github.com/Rerurate514/riebeckite/compare/v0.0.42...v0.0.43

## [0.0.42] - 2026-11-08

> **Breaking changes are included.** Read the migration notes before upgrading.

### Added

- Add a Quartz-style file explorer to the starter preset. The generated site now keeps the navigation tree in a collapsible left sidebar with a filter field and expands the active page's branch, while narrow screens keep using the existing header menu.
  Packages: `create-riebeckite`

- Give every preset a site footer that matches its layout. Starter and showcase pair the site identity with secondary navigation and a build credit, digital-garden, blog, and portfolio gain a build credit, and minimal and empty have lean footers of their own.
  Packages: `create-riebeckite`

### Changed

- Give the blog preset an explicit navigation with Posts, Tags, and Series links instead of deriving it from the content tree.
  Packages: `create-riebeckite`

- Reduce the top spacing above the Local Graph by removing the padding that was only needed for the former top border.
  Packages: `@riebeckite/plugin-local-graph`

### Fixed

- Keep the center note visible in a local graph when the orphan filter is enabled.
  Packages: `@riebeckite/graph`

- **Breaking:** Stop parsing directive syntax in Core by default so text such as `12:30` and `3:4` stays literal Markdown. The shortcodes plugin now registers `remark-directive` itself.
  Packages: `@riebeckite/core`, `@riebeckite/plugin-shortcodes`
  Migration: If your plugin handles directive nodes, add `remark-directive` to its dependencies and call `pipeline.use(remarkDirective)` in `extendMarkdownPipeline` before your own transform.

### Security

- Update the Open Graph image renderer dependency to remove a reported SVG escaping vulnerability and its vulnerable archive dependency.
  Packages: `@riebeckite/og-image`

[0.0.42]: https://github.com/Rerurate514/riebeckite/compare/v0.0.41...v0.0.42

## [0.0.41] - 2026-11-06

### Changed

- Remove the top border from trailing plugin sections and the theme rules that re-added it. Stacked sections such as Recent Posts and Related Posts are now separated by spacing only, and Article Metadata and Table of Contents keep their bottom rule.
  Packages: `@riebeckite/plugin-article-metadata`, `@riebeckite/plugin-backlinks`, `@riebeckite/plugin-changelog`, `@riebeckite/plugin-daily-notes`, `@riebeckite/plugin-diff`, `@riebeckite/plugin-local-graph`, `@riebeckite/plugin-recent-posts`, `@riebeckite/plugin-related-posts`, `@riebeckite/plugin-sidenotes`, `@riebeckite/plugin-toc`, `@riebeckite/plugin-webmention`, `@riebeckite/theme-default`, `@riebeckite/theme-editorial`, `@riebeckite/theme-folio`, `@riebeckite/theme-garden`, `@riebeckite/theme-gruvbox`, `@riebeckite/theme-minimal`, `@riebeckite/theme-rerurate`, `@riebeckite/theme-sakura`, `@riebeckite/theme-tokyonight`

[0.0.41]: https://github.com/Rerurate514/riebeckite/compare/v0.0.40...v0.0.41

## [0.0.40] - 2026-11-06

### Changed

- Canvas now opens with the whole diagram in view, supports reliable pan and zoom controls, and renders Obsidian Canvas edge sides and arrow ends. The showcase fixture and documentation use a connected Canvas example.
  Packages: `@riebeckite/plugin-canvas`, `create-riebeckite`

[0.0.40]: https://github.com/Rerurate514/riebeckite/compare/v0.0.39...v0.0.40

## [0.0.39] - 2026-11-05

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

[0.0.39]: https://github.com/Rerurate514/riebeckite/compare/v0.0.38...v0.0.39

## [0.0.38] - 2026-11-03

### Added

- Generate static Open Graph images for public pages in the `blog` preset, using the editorial layout that matches its theme.
  Packages: `create-riebeckite`

### Fixed

- Stop emitting the unsupported `prefix` option for `textFragment` in the `showcase` preset. The option was silently ignored, so generated sites now register `textFragment` without options. Generated site configurations are also typechecked against the plugin option types during scaffold validation.
  Packages: `create-riebeckite`

- `create-riebeckite` now prints usage for `--help` and unknown options, explains the non-interactive command when no interactive terminal is available, and omits `npm install` from the post-install next steps when dependencies are already installed.
  Packages: `create-riebeckite`

- `@riebeckite/og-image` now renders Hono JSX layouts without React.
  Packages: `@riebeckite/og-image`

[0.0.38]: https://github.com/Rerurate514/riebeckite/compare/v0.0.37...v0.0.38

## [0.0.37] - 2026-11-03

No user-facing changes recorded.

[0.0.37]: https://github.com/Rerurate514/riebeckite/compare/v0.0.36...v0.0.37

## [0.0.36] - 2026-11-03

> **Breaking changes are included.** Read the migration notes before upgrading.

### Added

- Add change entries, ADRs, and generated release notes so user-facing changes are recorded before release and published consistently to the changelog, the documentation site, and GitHub Releases.
  ADR: https://github.com/Rerurate514/riebeckite/blob/main/docs/agents/adr/20261102-143500-release-change-management-b2c3d4.md

- **Breaking:** Add an `inspector` plugin extension for Development Inspector tabs. Plugins can contribute build-time data tabs or a custom client module, and Inspector now addresses tabs by stable ids instead of numeric indexes.
  Packages: `@riebeckite/core`, `@riebeckite/dev-inspector`
  Migration: If you construct CompletedContentBuildSnapshot yourself, add the new inspectorTabs and finalHtmlDiagnostics fields.

- Add static PNG Open Graph image generation with deferred, cache-aware output rendering for public content.
  Packages: `@riebeckite/core`, `@riebeckite/honox`, `@riebeckite/og-image`, `@riebeckite/plugin-og-image`
  ADR: https://github.com/Rerurate514/riebeckite/blob/main/docs/agents/adr/20261103-deferred-og-image-outputs.md

### Changed

- Update the generated docs preset guide to include `check`, `build`, and a clearer link to the configuration page.
  Packages: `create-riebeckite`

### Fixed

- Publish the sample content generated by the `blog`, `digital-garden`, and `portfolio` presets so it is visible immediately instead of returning 404.
  Packages: `create-riebeckite`

- Fix mobile navigation and client-side regressions: keep the drawer above page controls, re-enable the color-mode toggle after SPA navigation, restore the theme preview in development, show an open link instead of an inline PDF on narrow screens, overlay image-comparison fallbacks, and hide the Explorer link unless the garden-explorer plugin is enabled.
  Packages: `@riebeckite/core`, `@riebeckite/ui`, `@riebeckite/plugin-color-mode`, `@riebeckite/plugin-image-compare`, `@riebeckite/plugin-local-graph`, `@riebeckite/plugin-pdf`

- Fix CLI usage error reporting so content usage errors use the shared `CLI_USAGE` contract, raw commands honor a leading `--help`, and JSON errors include the command. `upgrade --check` is now optional, and a typo with a built-in suggestion no longer loads the project.
  Packages: `@riebeckite/cli`, `@riebeckite/core`

- Keep both images of an image comparison stacked in the same grid cell when the lightbox plugin wraps them in links, so the before and after images overlay instead of appearing one below the other.
  Packages: `@riebeckite/plugin-image-compare`

- Stop reporting spurious D2 render timeouts during development when the dev server blocks the event loop longer than the render timeout. The timeout now starts a fresh window instead of failing a render that could not make progress.
  Packages: `@riebeckite/plugin-d2`

- Record diagnostics from `inspectGeneratedHtml` on the completed build snapshot instead of only writing them to the build log. Snapshot consumers such as the Development Inspector can now read them.
  Packages: `@riebeckite/honox`, `@riebeckite/dev-inspector`

### Security

- Harden the framework against request and network abuse: cap plugin endpoint request bodies at 1 MiB, make Webmention source verification fail closed and pin the validated DNS address, add a best-effort receive rate limit and a bounded memory store, require HTTPS for analytics collectors except on localhost, sandbox rich-embed iframes, compare the development inspector token in constant time, and pin GitHub Actions to commit SHAs. Update `@hono/node-server` to 2.1.3 and `minimatch` to 11.0.1.
  Packages: `@riebeckite/honox`, `@riebeckite/plugin-webmention`, `@riebeckite/plugin-analytics`, `@riebeckite/plugin-rich-embed`, `@riebeckite/dev-inspector`, `create-riebeckite`

[0.0.36]: https://github.com/Rerurate514/riebeckite/releases/tag/v0.0.36
