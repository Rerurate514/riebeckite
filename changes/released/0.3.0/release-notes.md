# Riebeckite v0.3.0

Released 2026-11-25.

> **Breaking changes are included.** Read the migration notes before upgrading.

### Added

- Generated sites can use npm (the default) or pnpm, selected with the new `Which package manager?` prompt or `--package-manager <npm|pnpm>` on `create-riebeckite` and `riebeckite init`. pnpm sites pin `pnpm@11.5.3`, print pnpm commands, and generate a workflow that installs with `pnpm install --frozen-lockfile`.
  Packages: `create-riebeckite`, `@riebeckite/cli`

### Changed

- **Breaking:** Plugin UI strings now ship with the plugin that renders them, in English and Japanese. The UI follows the content language by default, `ui.locale` still pins it, and `ui.labels` overrides individual strings per plugin namespace, for example `ui.labels.search.ja.searchPlaceholder`. Sites no longer copy framework dictionaries into their config to get a translated interface.
  Packages: `@riebeckite/core`, `@riebeckite/ui`, `@riebeckite/plugin-toc`, `@riebeckite/plugin-navigation`, `@riebeckite/plugin-search`, `@riebeckite/plugin-series`, `@riebeckite/plugin-l10n`, `@riebeckite/plugin-local-graph`, `@riebeckite/plugin-diff`, `@riebeckite/plugin-garden-explorer`
  Migration: Replace `ui.labels.<language>.<key>` with `ui.labels.<plugin>.<language>.<key>`. If you build UI with `@riebeckite/ui`, declare labels with `defineUiLabels(namespace, { en, ja })` and read them with `useUiLabels(definition)`. `DEFAULT_UI_LABELS`, the flat `UiLabels` type, and `resolveUiLabels(language, labels)` are removed.

- The remaining plugin UI strings now come from the shared label definitions in English and Japanese instead of hardcoded English, including the search status messages, copy buttons, canvas, bases views, slides, and timeline labels. Overrides use the same `ui.labels.<plugin>.<language>.<key>` shape. `@riebeckite/ui` also exposes a `@riebeckite/ui/labels` entry point for code that needs label resolution without the component runtime.
  Packages: `@riebeckite/ui`, `@riebeckite/plugin-article-metadata`, `@riebeckite/plugin-autocardlink`, `@riebeckite/plugin-bases`, `@riebeckite/plugin-calculator`, `@riebeckite/plugin-canvas`, `@riebeckite/plugin-code-enhance`, `@riebeckite/plugin-flashcards`, `@riebeckite/plugin-image-compare`, `@riebeckite/plugin-marp`, `@riebeckite/plugin-navigation`, `@riebeckite/plugin-properties`, `@riebeckite/plugin-qr-code`, `@riebeckite/plugin-search`, `@riebeckite/plugin-series`, `@riebeckite/plugin-sidenotes`, `@riebeckite/plugin-taxonomy`, `@riebeckite/plugin-timeline`, `@riebeckite/plugin-ux`, `@riebeckite/plugin-vault-heatmap`

- Label resolution now ignores dictionary and override keys that the English dictionary does not define, so `ResolvedUiLabels` and the runtime labels agree. The development inspector lists `ui.labels` entries that no loaded definition uses as unused overrides in the UI labels tab, and the reference documents the process-wide registration behavior of `defineUiLabels` and the ignored empty-string override.
  Packages: `@riebeckite/ui`, `@riebeckite/dev-inspector`

- **Breaking:** Published packages now require Node.js 22.13 or later and declare support for Node.js 22, 24, and 26 in their `engines` field. Node.js 20 is no longer supported.
  Packages: `@riebeckite/node`, `@riebeckite/graph`, `@riebeckite/diagram`, `@riebeckite/diagnostics`, `@riebeckite/ai`, `@riebeckite/git-history`, `@riebeckite/mcp`, `@riebeckite/og-image`, `@riebeckite/preview`, `@riebeckite/spa`, `@riebeckite/runtime`, `@riebeckite/analytics-cloudflare`, `@riebeckite/dev-inspector`, `@riebeckite/webmention-cloudflare`, `@riebeckite/plugin-alias`, `@riebeckite/plugin-analytics`, `@riebeckite/plugin-archive`, `@riebeckite/plugin-attachment`, `@riebeckite/plugin-backlinks`, `@riebeckite/plugin-breadcrumbs`, `@riebeckite/plugin-changelog`, `@riebeckite/plugin-chartjs`, `@riebeckite/plugin-citations`, `@riebeckite/plugin-code-annotations`, `@riebeckite/plugin-code-tabs`, `@riebeckite/plugin-color-mode`, `@riebeckite/plugin-d2`, `@riebeckite/plugin-daily-notes`, `@riebeckite/plugin-dataset`, `@riebeckite/plugin-dataview`, `@riebeckite/plugin-deploy`, `@riebeckite/plugin-diagnostics`, `@riebeckite/plugin-discord-embed`, `@riebeckite/plugin-docs`, `@riebeckite/plugin-excalibrain`, `@riebeckite/plugin-excalidraw`, `@riebeckite/plugin-folder-pages`, `@riebeckite/plugin-frontmatter-transformer`, `@riebeckite/plugin-gallery`, `@riebeckite/plugin-glossary`, `@riebeckite/plugin-graphviz`, `@riebeckite/plugin-hard-breaks`, `@riebeckite/plugin-highlight`, `@riebeckite/plugin-hover-preview`, `@riebeckite/plugin-icons`, `@riebeckite/plugin-image-optimizer`, `@riebeckite/plugin-kanban`, `@riebeckite/plugin-lightbox`, `@riebeckite/plugin-map`, `@riebeckite/plugin-markmap`, `@riebeckite/plugin-meta-bind`, `@riebeckite/plugin-mdx`, `@riebeckite/plugin-media`, `@riebeckite/plugin-mermaid`, `@riebeckite/plugin-mermaid-pele`, `@riebeckite/plugin-obsidian-markdown`, `@riebeckite/plugin-og-image`, `@riebeckite/plugin-pdf`, `@riebeckite/plugin-permalink`, `@riebeckite/plugin-plantuml`, `@riebeckite/plugin-quality`, `@riebeckite/plugin-query`, `@riebeckite/plugin-recent-posts`, `@riebeckite/plugin-related-posts`, `@riebeckite/plugin-rename`, `@riebeckite/plugin-responsive-image`, `@riebeckite/plugin-rich-embed`, `@riebeckite/plugin-seo`, `@riebeckite/plugin-share`, `@riebeckite/plugin-shortcodes`, `@riebeckite/plugin-source-files`, `@riebeckite/plugin-svg-optimizer`, `@riebeckite/plugin-text-fragment`, `@riebeckite/plugin-vega-lite`, `@riebeckite/plugin-wavedrom`, `@riebeckite/plugin-webmention`, `@riebeckite/test`, `@riebeckite/theme-default`, `@riebeckite/theme-editorial`, `@riebeckite/theme-fieldnotes`, `@riebeckite/theme-folio`, `@riebeckite/theme-garden`, `@riebeckite/theme-gruvbox`, `@riebeckite/theme-minimal`, `@riebeckite/theme-module`, `@riebeckite/theme-rerurate`, `@riebeckite/theme-sakura`, `@riebeckite/theme-signal`, `@riebeckite/theme-technical`, `@riebeckite/theme-terminal`, `@riebeckite/theme-tokyonight`
  Migration: Upgrade to Node.js 22.13 or later (22, 24, or 26) before updating.

### Fixed

- Keep a site's Riebeckite dependencies external to the development server's SSR bundle, so sites that use the MDX plugin start without `require is not defined`.
  Packages: `@riebeckite/honox`

### Security

- Update Zod to 4.6.7 to remove the advisory for memory exhaustion while validating oversized constrained collections. `@modelcontextprotocol/sdk` 1.32.2 accepts Zod 4, so the schemas are unchanged.
  Packages: `@riebeckite/mcp`

---

Full changelog: https://github.com/Rerurate514/riebeckite/blob/v0.3.0/CHANGELOG.md
Compare: https://github.com/Rerurate514/riebeckite/releases/tag/v0.3.0
