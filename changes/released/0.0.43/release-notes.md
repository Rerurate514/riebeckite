# Riebeckite v0.0.43

Released 2026-11-09.

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

---

Full changelog: https://github.com/Rerurate514/riebeckite/blob/v0.0.43/CHANGELOG.md
Compare: https://github.com/Rerurate514/riebeckite/releases/tag/v0.0.43
