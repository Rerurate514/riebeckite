# Riebeckite v0.1.0

Released 2026-11-19.

### Changed

- The Honox Vite plugin starts dev servers about a second sooner by resolving the Riebeckite application in parallel with Vite's own startup instead of awaiting it inside the config hook. Serve mode fires the resolution without blocking the listen step and every request-time hook awaits it on entry, while build mode still resolves synchronously in the config phase, so generated sites behave exactly as before.
  Packages: `@riebeckite/cli`, `@riebeckite/honox`

- The Honox integration and the development inspector load most of their module graph lazily, and the bundled Riebeckite config is cached on disk under `.riebeckite/config-bundle`, so dev servers start several seconds sooner. Import edges to `@riebeckite/core`, `@riebeckite/node`, `@riebeckite/diagnostics` and other heavy dependencies now resolve inside the functions that need them, which keeps every public signature unchanged. The config bundle cache is keyed by the resolved config file path, the esbuild version, and content digests of every bundled input plus the workspace package manifests, and it rebuilds automatically whenever any recorded input changes.
  Packages: `@riebeckite/cli`, `@riebeckite/honox`, `@riebeckite/dev-inspector`

### Fixed

- `richEmbed()` again renders `youtu.be` short links. The provider allow-list was missing the `youtu.be` host, so those URLs were reported as unsupported and stayed as plain code blocks even though the README lists them as supported.
  Packages: `@riebeckite/plugin-rich-embed`

---

Full changelog: https://github.com/Rerurate514/riebeckite/blob/v0.1.0/CHANGELOG.md
Compare: https://github.com/Rerurate514/riebeckite/releases/tag/v0.1.0
