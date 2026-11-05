# Autonomous documentation audit (2026-11-04 to 2026-11-05)

Branch: `docs/autonomous-audit-2026-11-04`
Base: `7a031cab`; latest `main` (`5f0f84ce`) is merged into the branch.
Status: **PARTIAL**

## Result

No known P0 or P1 documentation defects remain. The documentation now matches the implementation for the audited setup, development, build, configuration, plugin, theme, publication, deployment, and glossary paths.

The task is not marked READY. Convergence required two consecutive independent re-audits with zero new findings. Every re-audit found additional P2-level drift, so that condition was never met. No known P0/P1 remains. The final integration fixed the two implementation-adjacent issues found earlier (the scaffold README label and the ignored query option).

## Scope inventory

- 1152 Markdown files counted by `scripts/check_docs.mjs`.
- Site docs under `docs/docs/**` with English and `.ja.md` pairs.
- `docs/README*.md`, `docs/index*.md`, package READMEs, 84 plugin pages, 28 theme pages.
- CLI, Core, plugin API, theme API, configuration, publication, deployment, migration, Obsidian, localization, content repository, writing, analytics, accessibility, security, release, glossary, and framework pages.
- Internal `docs/agents/**` and historical `docs/audits/**` were checked for stale current claims but not rewritten as history.

## Verification performed

- `node scripts/check_docs.mjs`: pass, 1152 files.
- `node scripts/check_plugin_docs_parity.mjs`: pass, 84 plugins.
- `node scripts/sync_theme_docs.mjs --check`: pass, 28 themes.
- `git diff --check`: clean after each batch.
- Docs site production build: passed after the final edits (`pnpm --filter @riebeckite/web build`, 1109 rendered, 7 reused, 4m15s). The Excalidraw sample `docs/assets/HW.md` was made non-routable to remove an output collision; the embedded drawing still renders. The only remaining quality warnings are two series plugin pages with headings but no `<h1>`; these are generated plugin output, not a documentation claim.
- Full verification at the integration point: `pnpm check:docs`, `pnpm test:docs` (19/19), create-riebeckite (82/82), query plugin (22/22), CLI (225 passing, 1 pre-existing skip), `pnpm check:scaffold`, and quality plugin (20/20) all passed.
- Scaffold integration fixes: the generated README prints `/` for the home page instead of `/index`, and the showcase preset no longer passes the ignored query `defaultLimit`. Golden scaffold files were regenerated and pass.
- Anchor quality rule decodes percent-encoded fragments before matching ids; a regression test covers encoded Japanese fragments and malformed encoding. Heading-level fixes removed the remaining real skip warnings.
- Scaffold smoke test: generated `starter`, ran `npm install`, `npm exec riebeckite check`, `npm exec riebeckite build`; all passed. Dev server returned HTTP 200 on `/`.
- Generated Cloudflare and GitHub Actions scaffolds inspected: `wrangler.jsonc`, `publish.yml`, `notify-site.yml`, lockfile and `npm ci` requirements.
- CLI behavior checked against source and live `--help`: commands, subcommands, flags, publish actions, provider resolution, deploy domain, upgrade, diagnostics.
- Anchor scan across 806 site files; three real broken anchors fixed. Wikilink scan found only intentional examples and assets.
- Multiple independent DeepSeek audits were run across disjoint scopes after each fix batch.

## Fixed findings

P1 examples:

- Non-interactive scaffold instructions omitted `cd` and `npm install`, breaking build and CI.
- GitHub Actions instructions created no `package-lock.json` before requiring `npm ci`.
- `Not now` Cloudflare sites need `--provider cloudflare-workers`, because provider detection runs before `wrangler.jsonc` creation.
- `publish run` run-only flags were shown as applying to every publish action.
- `create` subcommands, `upgrade --to`, `bridge approve`, and `deploy domain` behavior corrected.
- Wrong plugin claims: HTML injection by Breadcrumbs/Series, Local Graph helper signature, TOC invalid component usage, Permalink append behavior.
- Editor Bridge token is an environment variable, not a `dev` flag.
- Prefix/root and CSS cascade guidance corrected for shipped `rb-*` plugin roots.
- Build state is committed during SSG after the manifest and before page output, so a failure after the commit can leave new state.
- Draft/private content is absent from public output but remains in `manifest.entries`.
- Default publish strategy is `explicit`; `published` is a date, not a publish switch.
- `deploy domain` can upload after confirmation; `deploy setup` and `deploy workflow` do not.

P2 examples:

- Config defaults, `describeConfig` errors, `exclude` behavior, theme validation, output dependencies, redirects, slugs, diagnostics, hooks, cache reasons, JSON output, and API export lists aligned with source.
- Migration guides: SEO options must be enabled; draft content remains in the build-time manifest.
- Search, recent posts, hover preview, analytics, diagnostics, folder pages, and changelog component behavior corrected.
- EN/JA factual contradictions fixed, including security sanitization, post-link lists, localization options, and deployment secrets.
- Broken anchors and package examples fixed; generated plugin READMEs resynced.

## Unresolved

- Two consecutive zero-new-finding independent audits were not achieved. Findings were all P2 after the P1 batch, but they kept appearing in less-traveled pages.
- The series plugin generates pages with headings but no `<h1>`. This is a pre-existing quality warning in generated plugin output, not a documentation claim.
- The query plugin still accepts but ignores `defaultSort` and `defaultLimit`. The documentation no longer promises them; removing the dead options is follow-up implementation work.

## Unverified

These depend on external platforms or credentials and were not executed:

- Real Cloudflare Workers login, deploy, Custom Domain DNS/TLS, and dashboard behavior.
- GitHub Actions execution, repository secrets, PAT scopes, and `repository_dispatch`.
- Netlify and Vercel CLI authentication and uploads.
- npm/pnpm install-script approval flows.
- Upstream Obsidian plugin behavior and compatibility matrices.
- Browser codec, CSP, CSS cascade, and accessibility/WCAG claims.
- Benchmark and bundle-size numbers.
- The repository's own publication workflow was not run end to end.

## Commits

```text
54c5275e ドキュメントと実装の不一致を修正
bf799cfb デプロイ手順と用語集の記述を実装に合わせる
b4688cca 壊れた見出しリンクを修正
e137310b 再監査で見つかった記述のずれを修正
5b7fa7d1 公開手順とプラグイン例の記述を修正
e3107004 監査で残った記述のずれを修正
588b840f ビルド状態とCSSフックの記述を修正
1203ed38 監査で残ったコマンドとキャッシュの記述を修正
16f83e9c 入門手順とプラグイン資料の記述を修正
0cc91e74 最終監査で見つかった記述のずれを修正
7bece58b 最終監査で見つかった記述のずれを修正
3f853bca 監査で残ったプラグインと診断の記述を修正
53a94f36 監査で残った入門と目次の記述を修正
a8d2c238 Frameworkと用語集の残存記述を修正
72eeb89d 自律監査の結果を記録
832b0fcb 監査レポートの検証結果を更新
b2d84013 スキャフォールドと品質検査の不整合を修正
65ab8d05 Merge branch 'main' into docs/autonomous-audit-2026-11-04
b6da01a8 Merge branch 'main' into docs/autonomous-audit-2026-11-04
1acbefb5 監査レポートを統合後の状態に更新
86fa65ad 同期したプラグインREADMEを更新
```

## Recurrence prevention

The current checks validate links, EN/JA pairing, plugin README parity, and theme README sync. This audit added percent-encoded anchor matching to the quality plugin. Useful additions, in order:

1. Typecheck fenced TypeScript examples that are marked copyable.
2. Compare documented CLI commands and options with `builtins.ts`.
3. Check config examples against `RiebeckiteConfig` and `resolveConfig`.
4. Add a small glossary contract test for enum values and defaults.
5. Keep plugin docs generated from a single source where practical.

These remain follow-up work; they were not added in this audit.

## Readiness

- Setup and first publish path: usable.
- Development and build: verified locally.
- Deployment docs: correct for the supported paths; real uploads unverified.
- Final verdict: **PARTIAL**, not READY, because convergence was not reached. The integration fixes and latest `main` are included.
