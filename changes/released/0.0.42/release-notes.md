# Riebeckite v0.0.42

Released 2026-11-08.

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

---

Full changelog: https://github.com/Rerurate514/riebeckite/blob/v0.0.42/CHANGELOG.md
Compare: https://github.com/Rerurate514/riebeckite/releases/tag/v0.0.42
