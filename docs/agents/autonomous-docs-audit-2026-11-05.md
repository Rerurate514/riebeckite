# Autonomous documentation audit (2026-11-05)

Branch: `docs/autonomous-audit-2026-11-04`
Status: IN PROGRESS

## Scope inventory

- 1150 Markdown files counted by `scripts/check_docs.mjs`.
- Site docs: `docs/docs/**` (English and `.ja.md` pairs), `docs/README*.md`, `docs/index*.md`.
- Package docs: 84 plugin pages (`docs/docs/plugins/**`), 28 theme pages (`docs/docs/themes/**`), CLI/Core/plugin API reference, package READMEs.
- Guides: getting started, deployment, content repositories, Obsidian, localization, migration, writing, analytics, customization.
- Excluded from site checks but audited where relevant: `docs/agents/**`, `docs/audits/**`.

## Loop 1

### Verified scenarios

- `node scripts/check_docs.mjs` passes (1150 files).
- `node scripts/check_plugin_docs_parity.mjs` passes (84 plugins).
- `node scripts/sync_theme_docs.mjs --check` passes (28 themes).
- Scaffold generation checked for `starter`, `minimal --cloudflare-workers`, `starter --github-actions`.
- CLI commands and options checked against `packages/cli/src/command/builtins.ts` and live `--help`.

### Fixed findings

P1:

- Getting-started deployment: missing `cd`/`npm install` before `npm exec` and before `npm ci`; clarified non-interactive scaffold behavior (EN/JA).
- GitHub Actions setup: package-lock prerequisite made actionable (EN/JA).
- Publication workflow: corrected blanket "deploy no longer deploys"; `deploy domain` can deploy after confirmation (EN/JA).
- Glossary deployment: `deploy domain` edits JSON only, leaves `wrangler.toml` unchanged (EN/JA).
- CLI reference: separated `create` subcommands, moved run-only publish flags, made `--to` required for `upgrade` (EN/JA and related pages).
- Plugin docs: breadcrumbs/series falsely claimed HTML injection; local-graph documented wrong helper signature (EN/JA).

P2:

- Quick-start JA missing Wrangler install note; Cloudflare Workers "run it first" ambiguity.
- Other hosts: GitHub Pages is not deployed by `publish run`.
- Theme config: unknown keys throw; error class distinction.
- Plugin API: generated output dependency rules, version pin, broken JA examples.
- Analytics: `analytics-untracked` appears in `doctor`, not `check`/`build`.
- Branding: favicon comes from `RiebeckiteHead`, not `_renderer.tsx`.
- Localization: Backlinks has no `localeMode`; only Timeline adds the language badge.
- Content repositories: `content.directory` accepts absolute paths.
- Starter preset: only home/examples are locale-selected; guide and notes remain English.
- Build state: committed before SSG, so later failure can leave new state.
- Cache hits skip content hooks.
- HonoX UI prop types are internal.
- HonoX package is not the scaffold generator.
- Source pipeline hook order corrected.
- Plugin pages: search aliases/weight and normalization, navigation exports, lightbox client entry, related-posts HTML claim, recent-posts locale, hover-preview index bound, backlinks helper/example, folder-pages `/folders` ownership, changelog opening, diagnostics missing codes, analytics marker scope.

## Verification after loop 1

- `node scripts/check_docs.mjs`: pass.
- `node scripts/check_plugin_docs_parity.mjs`: pass.
- `node scripts/sync_theme_docs.mjs --check`: pass.
- `git diff --check`: clean.

## Unverified / blocked

- Docs site production build (`pnpm --filter @riebeckite/web build`) not yet run.
- Full scaffold -> install -> `check` -> `dev` -> `build` smoke test not yet run; worktree has no dependencies.
- Real Cloudflare/GitHub Pages/Netlify/Vercel uploads require credentials and are out of scope.

## Loop 2

Pending independent re-audit.
