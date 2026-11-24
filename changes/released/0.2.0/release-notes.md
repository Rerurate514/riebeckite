# Riebeckite v0.2.0

Released 2026-11-23.

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

---

Full changelog: https://github.com/Rerurate514/riebeckite/blob/v0.2.0/CHANGELOG.md
Compare: https://github.com/Rerurate514/riebeckite/releases/tag/v0.2.0
