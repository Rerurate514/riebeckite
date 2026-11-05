# Inventory — Release Readiness Audit 2026-11

Audited commit: `7a031cabaec5974f2d409dde938444d6a5f9b03d` (`main`, 2026-11-04)
Audit branch: `audit/release-readiness-2026-11`
Environment: Windows 11, Node 24.22.1, pnpm 12.15.0, Git 2.48.1, Chrome 156 (Puppeteer)

## Scope counts

| Surface | Count | Source of truth |
| --- | --- | --- |
| Workspace projects | 118 | `pnpm install` scope |
| Public packages | 116 | `scripts/package_metadata.mjs` → `PACKAGE_DIRECTORIES` |
| CLI command definitions | 47 | `packages/cli/src/command/builtins.ts` |
| Official plugins | 84 | `packages/plugins/*` |
| Official themes | 14 | `packages/themes/*` |
| Integrations | 3 | `packages/integrations/*` |
| Documentation pages (EN) | 806 | `docs/docs/**/*.md` (excluding `*.ja.md`) |
| Documentation pages (JA) | 403 | `docs/docs/**/*.ja.md` |
| Package test files | 307 | `packages/**/*.test.ts` |
| Cross-package test files | 11 | `tests/**/*.test.ts(x)` |
| CI workflows | 5 | `.github/workflows/*.yml` |

## Package list (116 public)

Core packages: `@riebeckite/cli`, `@riebeckite/core`, `create-riebeckite`,
`@riebeckite/dev-inspector`, `@riebeckite/diagnostics`, `@riebeckite/diagram`,
`@riebeckite/git-history`, `@riebeckite/graph`, `@riebeckite/node`,
`@riebeckite/og-image`, `@riebeckite/preview`, `@riebeckite/runtime`,
`@riebeckite/spa`, `@riebeckite/test`, `@riebeckite/ui`.

Integrations: `@riebeckite/analytics-cloudflare`, `@riebeckite/honox`,
`@riebeckite/webmention-cloudflare`.

Plugins: 84 packages under `packages/plugins/*`.

Themes: default, editorial, fieldnotes, folio, garden, gruvbox, minimal,
module, rerurate, sakura, signal, technical, terminal, tokyonight.

## CLI commands (implemented registry, not docs)

`dev`, `build`, `clean`, `check`, `doctor`, `profile`, `upgrade`, `init`,
`inspect` (+ `config`, `plugins`, `content`, `graph`, `build`, `assets`,
`provenance`, `api`), `create` (+ `site`, `plugin`, `theme`, `page-type`,
`component`), `theme preview`, `plugin dev`, `plugin verify`, `content`,
`bridge approve`, `migrate` (+ 7 actions), `publish` (+ 8 actions), `deploy`
(+ `setup`, `workflow`, `domain`), `help`, `completion`.

## CI jobs

`changes`, `check`, `build`, `typecheck`, `test`, `cross-platform`
(Windows/macOS), `integration-e2e`, `plugin-dx`, `scaffold`, `browser`,
`production-assets`.

## Test entry points

`pnpm test`, `test:docs`, `test:release`, `test:changelog`, `test:registry`,
`test:visual`, `test:e2e:external`, `test:e2e:fast-path`,
`test:e2e:fingerprint`, `test:e2e:preset-fast-path`, `test:browser`,
`test:plugin-dev:browser`, `test:inspector:browser`, `test:spa:browser`,
`test:runtime:browser`, `test:runtime:site`, `test:runtime:performance`,
`test:plugin-dx`, `test:plugin-dx:external`, benchmark scripts.
