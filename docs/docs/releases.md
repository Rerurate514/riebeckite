---
title: Release Notes
sidebar:
  label: Release Notes
  order: 7
---
# Release Notes

Riebeckite release history generated from the change entries under `changes/`.

The complete changelog is [CHANGELOG.md](https://github.com/Rerurate514/riebeckite/blob/main/CHANGELOG.md). Published releases are also available on [GitHub Releases](https://github.com/Rerurate514/riebeckite/releases).

The Unreleased section lists changes that are merged but not yet published to npm. Release history starts with the first release after this system was introduced; earlier versions remain available as Git tags and GitHub Releases.

## Unreleased

> **Breaking changes are included.** Read the migration notes before upgrading.

### Added

- Add a Quartz-style file explorer to the starter preset. The generated site now keeps the navigation tree in a collapsible left sidebar with a filter field and expands the active page's branch, while narrow screens keep using the existing header menu.
  Packages: `create-riebeckite`

- Give every preset a site footer that matches its layout. Starter and showcase pair the site identity with secondary navigation and a build credit, digital-garden, blog, and portfolio gain a build credit, and minimal and empty have lean footers of their own.
  Packages: `create-riebeckite`

- Add `@riebeckite/plugin-reactions` and `@riebeckite/plugin-comments`, two new
  plugins that bring Zenn/Qiita-style engagement to published notes. Reactions
  renders emoji reaction buttons (👍 ❤️ 🎉 💡 🤔) with counts, and Comments
  renders comment threads. Both are backed by pluggable providers with in-memory
  defaults, plus production adapters: Cloudflare D1
  (`@riebeckite/reactions-cloudflare`, `@riebeckite/comments-cloudflare`) and
  GitHub Discussions (`@riebeckite/reactions-github`, `@riebeckite/comments-github`).
  Packages: `@riebeckite/plugin-reactions`, `@riebeckite/plugin-comments`, `@riebeckite/reactions-cloudflare`, `@riebeckite/comments-cloudflare`, `@riebeckite/reactions-github`, `@riebeckite/comments-github`

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

## 0.0.41 - 2026-11-06

### Changed

- Remove the top border from trailing plugin sections and the theme rules that re-added it. Stacked sections such as Recent Posts and Related Posts are now separated by spacing only, and Article Metadata and Table of Contents keep their bottom rule.
  Packages: `@riebeckite/plugin-article-metadata`, `@riebeckite/plugin-backlinks`, `@riebeckite/plugin-changelog`, `@riebeckite/plugin-daily-notes`, `@riebeckite/plugin-diff`, `@riebeckite/plugin-local-graph`, `@riebeckite/plugin-recent-posts`, `@riebeckite/plugin-related-posts`, `@riebeckite/plugin-sidenotes`, `@riebeckite/plugin-toc`, `@riebeckite/plugin-webmention`, `@riebeckite/theme-default`, `@riebeckite/theme-editorial`, `@riebeckite/theme-folio`, `@riebeckite/theme-garden`, `@riebeckite/theme-gruvbox`, `@riebeckite/theme-minimal`, `@riebeckite/theme-rerurate`, `@riebeckite/theme-sakura`, `@riebeckite/theme-tokyonight`

[Compare](https://github.com/Rerurate514/riebeckite/compare/v0.0.40...v0.0.41)

## 0.0.40 - 2026-11-06

### Changed

- Canvas now opens with the whole diagram in view, supports reliable pan and zoom controls, and renders Obsidian Canvas edge sides and arrow ends. The showcase fixture and documentation use a connected Canvas example.
  Packages: `@riebeckite/plugin-canvas`, `create-riebeckite`

[Compare](https://github.com/Rerurate514/riebeckite/compare/v0.0.39...v0.0.40)

## 0.0.39 - 2026-11-05

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

[Compare](https://github.com/Rerurate514/riebeckite/compare/v0.0.38...v0.0.39)

## 0.0.38 - 2026-11-03

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

[Compare](https://github.com/Rerurate514/riebeckite/compare/v0.0.37...v0.0.38)

## 0.0.37 - 2026-11-03

No user-facing changes recorded.

[Compare](https://github.com/Rerurate514/riebeckite/compare/v0.0.36...v0.0.37)

## 0.0.36 - 2026-11-03

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

[Compare](https://github.com/Rerurate514/riebeckite/releases/tag/v0.0.36)
