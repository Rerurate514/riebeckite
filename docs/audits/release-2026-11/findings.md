# Finding Ledger

Target commit: `7a031cabaec5974f2d409dde938444d6a5f9b03d`

Severity: P0 (security/data loss), P1 (release blocker), P2 (limited defect),
P3 (minor), UNVERIFIED, FALSE POSITIVE.

## AUD-001 —`pnpm check:packages` fails at HEAD

- **Severity**: P1
- **Confidence**: High (executed)
- **Files**: `packages/integrations/honox/package.json`,
  `packages/dev-inspector/package.json`, `scripts/package_metadata.mjs:862,871`
- **Reproduction**: `pnpm check:packages` at the audited commit.
- **Observed**: 2 errors.
  - `@riebeckite/honox: scripts.test must be "node --import tsx --test --test-concurrency=1 \"test/*.test.ts\"", received "node --max-old-space-size=4096 --import tsx --test --test-concurrency=1 \"test/*.test.ts\""`
  - `@riebeckite/dev-inspector: files must be ["LICENSE","README.md","README_ja.md","dist"], received ["LICENSE","BRIDGE.md","BRIDGE_ja.md","README.md","README_ja.md","dist"]`
- **Expected**: `check:packages` passes; CI `check` job is green.
- **Root cause**: commits `0a3e076a` (HonoX test heap flag) and `6b5defd4`
  (Bridge API docs) changed package manifests without updating the expected
  metadata table. The gate is stale, not the manifests: `BRIDGE.md` is linked
  from the published README, and the heap flag prevents OOM in the HonoX suite.
- **Impact**: every CI run on `main` fails the `check` job; release cannot pass
  its own gate.
- **Fix**: update `scripts/package_metadata.mjs` expectations.
- **Regression test**: `pnpm check:packages` (already part of CI `check`).
- **Remediation commit**: `a80256a8`.
- **Independent re-audit**: PASS (independent reviewer verified the metadata
  table against both package manifests and ran `check:packages`).

## AUD-002 —Content-free test entry points are easy to miss in CI

- **Severity**: P3 (advisory)
- **Confidence**: High (static)
- **Files**: `.github/workflows/ci.yml`
- **Observation**: `ci.yml` runs package tests and selected browser suites, but
  `test:runtime:site`, `test:runtime:performance`, `test:e2e:fast-path`,
  `test:e2e:fingerprint` and `test:e2e:preset-fast-path` are conditional on the
  `changes` selector; a regression in those paths is not caught unless the diff
  matches. This is a deliberate cost tradeoff, not a defect. Recorded so the
  release report does not claim unconditional coverage.
- **Action**: document as a coverage limitation; do not change without evidence.

## AUD-003 —`check:dependencies` reports unused declared dependencies

- **Severity**: P3
- **Confidence**: High (executed)
- **Files**: `packages/plugins/excalidraw/package.json`,
  `packages/plugins/og-image/package.json`
- **Observed warnings**:
  - `@riebeckite/plugin-excalidraw` declares `@excalidraw/excalidraw` and
    `esbuild` with no static import.
  - `@riebeckite/plugin-og-image` declares `hono` with no static import.
- **Notes**: `@excalidraw/excalidraw` is resolved at runtime through
  `resolvePackageEntry` in `src/render-static.ts`, so the declaration is
  intentional. `esbuild` and `hono` need verification before removal; removing a
  dependency is a packaging change, not a gate fix.
- **Action**: verify usage, then either remove or teach the checker about the
  runtime resolution. Deferred until after release-blocking items.

## AUD-004 —Unreleased user-facing changes on `main`

- **Severity**: P2 (release process)
- **Confidence**: High (git + registry)
- **Observed**: npm `latest` is `0.0.38`, equal to the manifests, but `main`
  contains 4 unreleased change entries (Bridge unification, Excalidraw static
  SVG, drawer scroll, audit fixes) after tag `v0.0.38`.
- **Impact**: documentation deployed from `main` describes behavior not present
  in the published `0.0.38` packages until the next release.
- **Action**: release process must either publish a new version or docs must not
  be deployed ahead of packages. No publish is performed in this audit.

## AUD-005 —Plugin pages could not shadow content routes (CI red)

- **Severity**: P1
- **Confidence**: High (executed)
- **Files**: `packages/core/src/content/output_dependency.ts:211`,
  `packages/core/test/output_dependency.test.ts:784`,
  `packages/plugins/archive/test/archive.test.ts:259`,
  `packages/plugins/excalidraw/test/excalidraw_page.test.ts:41`
- **Reproduction**: `pnpm -r --workspace-concurrency=1 test` at `7a031ca`,
  or `pnpm --filter @riebeckite/plugin-archive test` and
  `pnpm --filter @riebeckite/plugin-excalidraw test`.
- **Observed**: `archive pages coexist with content routes and win the plugin
  match` and five `excalidraw_page` tests fail with
  `Output path "note.html" collides with content output owned by
  "content:note" and plugin-page output owned by
  "plugin:excalidraw:page:excalidraw-document"`. `pnpm -r test` stops at the
  first failing package.
- **Expected**: A plugin page intentionally replaces the content route at the
  same public path. The HonoX adapter resolves plugin pages before
  manifest-backed content routes
  (`packages/integrations/honox/src/content_route.ts:22`), and both the archive
  and excalidraw plugins rely on that contract. The output inventory must emit
  the plugin page and omit the shadowed content output.
- **Root cause**: commit `f50f8678` broadened
  `assertNoGeneratedOutputCollision` from generated-output conflicts to all
  output kinds. That made legitimate content-to-plugin-page shadowing a fatal
  build error, contradicting the documented routing precedence and the two
  plugins' tests.
- **Impact**: CI `test` job is red at HEAD; any site using the CLI archive or
  excalidraw page type fails the build when a note shares the page route.
- **Fix**: in `buildOutputInventory`, drop a content output when a plugin page
  claims the same HTML path, then add the plugin page. A redirect output is
  skipped when a content output already owns the same HTML path, so
  `folder/index.md` collapsed to `/folder/` keeps its page instead of being
  replaced by the `/folder/index` redirect. Generated outputs and two plugin
  pages still fail on collisions. Restore the original archive test, which
  covers the shadowing contract.
- **Third manifestation**: the inventory fix alone did not stop the real SSG
  from enumerating the self redirect. `riebeckiteSsgParams` read
  `manifest.publicRedirects` directly, so a full build wrote the redirect stub
  over `folder/index.html` after the content page, producing a refresh loop.
  The SSG parameter builder now applies the same producer-scoped check and
  omits a redirect whose own permalink resolves to the same output path.
- **Second manifestation**: after the plugin-page fix, the full suite exposed
  `@riebeckite/plugin-folder-pages` test
  `collapses an index folder entry to the folder URL and redirects the old URL`
  failing with `Output path "folder/index.html" collides with content output
  owned by "content:folder/index" and redirect output owned by
  "content:folder/index:redirect"`. The folder-pages plugin intentionally maps
  `folder/index.md` to `/folder/` and redirects `/folder/index`; both resolve to
  the same static file. The canonical content page must win.
- **Regression test**: `pnpm --filter @riebeckite/core test` (503/503),
  `pnpm --filter @riebeckite/plugin-archive test` (13/13),
  `pnpm --filter @riebeckite/plugin-excalidraw test` (12/12),
  `pnpm --filter @riebeckite/plugin-folder-pages test` (24/24), and the HonoX
  SSG test `a collapsed folder page is not replaced by its own redirect stub`
  which builds a real site and asserts the page content survives both a cold
  and an incremental build. Core tests
  `plugin pages replace content routes they shadow`,
  `a plugin page taking over a content route affects the output without removing
  it`, and `a redirect that resolves to a content output leaves the content
  page` pin the inventory behavior.
- **Remediation commits**: `55846cc0` (plugin pages), `5268b741` (transition
  test), `f7328eff` (redirect collision), `0428ae47` (SSG suppression).
- **Independent re-audit**: PASS for `55846cc0`; `f7328eff` was initially
  PASS, then a full-diff reviewer found the real-SSG write-order bug. The
  re-audit after the SSG fix is pending.

## AUD-006  ESearch browser suite red after locale filtering

- **Severity**: P1
- **Confidence**: High (executed)
- **Files**: `packages/plugins/search/test/browser/search-modal.test.ts`
- **Reproduction**: `pnpm test:browser` at HEAD.
- **Observed**: 7 of 16 tests time out waiting for two search results. The  fixture document is `lang="en"` and contained one English note and one
  Japanese note, but the modal now filters to the document language.
- **Expected**: The browser fixture follows the documented language-scoped
  search behavior, including the `lang:` override.
- **Root cause**: commit `7dd6df7c` moved search to the shared locale policy
  and filtered results by `document.documentElement.lang`; the browser fixture
  still assumed an unfiltered pool.
- **Impact**: the CI browser job is red at HEAD, blocking the release pipeline.
- **Fix**: make the second fixture note English and add a Japanese note plus a
  test for the default language scope and the explicit `lang:en` override.
- **Regression test**: `pnpm test:browser` (17/17).
- **Remediation commit**: `189c5817`.
- **Independent re-audit**: PASS (final diff reviewer).

## AUD-007  EInspector browser E2E fixture resolved the wrong workspace root

- **Severity**: P2
- **Confidence**: High (executed)
- **Files**: `tests/development-inspector/fixture/vite.config.ts`
- **Reproduction**: `pnpm test:inspector:browser` at HEAD.
- **Observed**: the inspector button never appears. Vite returns 500 for
  `virtual:riebeckite/client` because `@riebeckite/spa` cannot be resolved.
- **Expected**: the copied fixture resolves workspace packages and the inspector
  initializes in a real dev server.
- **Root cause**: the test copies the fixture to `website/inspector-e2e-fixture`
  but the fixture computed `workspaceRoot` as three levels above `appRoot`, which
  is the repository parent at that location. No package aliases were created.
- **Impact**: the inspector browser suite is broken, but it is not wired into
  CI, so releases were not blocked.
- **Fix**: resolve `workspaceRoot` two levels above `appRoot`.
- **Regression test**: `pnpm test:inspector:browser` (1/1).
- **Remediation commit**: `07fb1f88`.
- **Independent re-audit**: PASS (final diff reviewer).

## AUD-008  EStrict package managers cannot build a scaffolded site

- **Severity**: P1
- **Confidence**: High (executed on published 0.0.38)
- **Files**: `packages/create-riebeckite/src/scaffold/templates.ts`
- **Reproduction**: scaffold or create a site, install with pnpm, then run
  `pnpm exec riebeckite build`. A minimal site with `spa: true` was built from
  the published `0.0.38` tarballs in
  `C:\Users\rerur\AppData\Local\Temp\riebeckite-pnpm-spa-published`.
- **Observed**: the client build fails with `Failed to resolve import
  "@riebeckite/spa"`, then the SSG build fails with `Failed to resolve import
  "@riebeckite/node"`. npm works only because it hoists transitive dependencies
  to the project root.
- **Expected**: a site installed with pnpm builds after the documented
  `pnpm approve-builds` step.
- **Root cause**: the framework virtual modules import `@riebeckite/node`,
  `@riebeckite/runtime`, and `@riebeckite/spa` at the site root, but the
  scaffold manifest declared only `core`, `honox`, and `ui`. pnpm and Yarn PnP
  do not expose transitive dependencies to the site.
- **Impact**: pnpm users cannot build any scaffolded site; SPA users also fail
  after adding only `@riebeckite/spa`.
- **Fix**: declare all three internal runtime packages in the generated site
  manifest and document the upgrade step for older sites.
- **Regression test**: `pnpm --filter create-riebeckite test:golden` (10/10)
  pins the generated manifests; the published-package pnpm build passes after
  adding the three packages; `pnpm check:docs` (1150 files) passes.
- **Remediation commit**: `03e61926`.
- **Independent re-audit**: PASS (final diff reviewer).

## AUD-009  EVisual baselines are pinned to an unavailable Chrome and not in CI

- **Severity**: P2 (coverage gap)
- **Confidence**: High (static + attempted execution)
- **Files**: `tests/visual/theme_visual_baseline.mjs`,
  `tests/visual/manifest.json`
- **Observed**: with Chrome `155.0.8059.79` installed explicitly and
  `PUPPETEER_EXECUTABLE_PATH` pointed at it, `pnpm test:visual` compared 28
  desktop/mobile variants and reported 36 changed images, so the baselines are
  stale. Desktop differences are 3.1 E.3% of pixels; mobile differences reach
  20 E3%. Capture checks still report zero low-contrast text and zero overlap.
  No CI workflow runs `test:visual`.
- **Impact**: theme visual regressions are not gated, and the pinned baselines
  cannot reproduce the current themes even on the pinned browser.
- **Action**: review the 36 diffs, then regenerate baselines or fix the layout
  regression if one is found, and pin the browser version in CI. Baselines were
  not regenerated in this audit because that would accept unreviewed visual
  changes.

## AUD-010  ED2 README omits the SVG trust warning

- **Severity**: P3
- **Confidence**: High (docs comparison)
- **Files**: `packages/plugins/d2/README.md`,
  `packages/plugins/d2/src/init.ts:54`
- **Observed**: client-side D2 render mode assigns renderer-produced SVG through
  `innerHTML`. Graphviz documents that renderer output is unsanitized, but the
  D2 README does not repeat that warning.
- **Impact**: a site owner enabling client rendering may trust diagram source
  more than the documented trust model allows. Markdown sanitization does not
  cover plugin-generated SVG.
- **Action**: add the same trust warning to the D2 README, or sanitize renderer
  SVG. Deferred as documentation hardening.

## AUD-011  EPublic CLI result type triggers a Biome advisory

- **Severity**: P3
- **Confidence**: High (executed)
- **Files**: `packages/core/src/cli/types.ts:96`
- **Observed**: `pnpm check` reports one `noConfusingVoidType` advisory for a
  `void` member of `CliCommandResult`.
- **Impact**: advisory only; the type is public, so changing it is an API change
  rather than a lint cleanup.
- **Action**: propose the type change separately; do not change it in this audit.

## AUD-012 ? Ordinary `riebeckite dev` exits unless managed Bridge variables are set

- **Severity**: P1
- **Confidence**: High (reproduced with a published-artifact starter)
- **Files**: `packages/cli/src/commands/dev.ts`, `packages/cli/test/managed_dev.test.ts`
- **Observed**: after `npx create-riebeckite` and `npm install`, running
  `riebeckite dev` starts Vite, prints the local URL, then exits with
  `Managed development requires a loopback Bridge.` and status 1. The normal
  development server is unusable without `RIEBECKITE_BRIDGE_TOKEN` and the
  managed-session environment variables.
- **Expected**: an ordinary `riebeckite dev` starts and serves the site without
  managed Bridge configuration.
- **Root cause**: `runDev` always installed an `onServerReady` callback that
  required a loopback Bridge token, even when `managedDevReporter()` returned
  `undefined` because the process was not launched by a managed host.
- **Impact**: normal local development is blocked for every external user. The
  external artifact E2E did not cover `dev`, so the suite stayed green.
- **Fix**: `onDevServerReady` returns immediately when there is no managed
  reporter; the Bridge token and origin checks still apply to managed starts.
- **Regression test**: `managed_dev.test.ts` asserts an ordinary start resolves
  without a token and a managed start without a token still rejects. A real
  external starter was started from the rebuilt CLI: the server stayed alive,
  served `/`, and reflected a content edit on reload.
- **Remediation commit**: `d8986a55`.
- **Independent re-audit**: PASS (focused reviewer; ordinary and managed paths, behavior preservation, minimal diff; two Low notes: token-without-managed self-check is skipped, success path lacks a unit stub).
