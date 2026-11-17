# Riebeckite v0.0.51

Released 2026-11-17.

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

---

Full changelog: https://github.com/Rerurate514/riebeckite/blob/v0.0.51/CHANGELOG.md
Compare: https://github.com/Rerurate514/riebeckite/releases/tag/v0.0.51
