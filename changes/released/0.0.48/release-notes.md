# Riebeckite v0.0.48

Released 2026-11-15.

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

---

Full changelog: https://github.com/Rerurate514/riebeckite/blob/v0.0.48/CHANGELOG.md
Compare: https://github.com/Rerurate514/riebeckite/releases/tag/v0.0.48
