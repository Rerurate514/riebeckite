# Riebeckite v0.0.38

Released 2026-11-03.

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

---

Full changelog: https://github.com/Rerurate514/riebeckite/blob/v0.0.38/CHANGELOG.md
Compare: https://github.com/Rerurate514/riebeckite/releases/tag/v0.0.38
