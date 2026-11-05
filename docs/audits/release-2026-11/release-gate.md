# Release gate report

Integration branch: `integration/release-readiness-2026-11`
Base: `main` `54f726f3`
Merge commit: `feb31a49`
Target release: 0.0.39

## Verdict

**READY** for integration into `main`, after the operational steps below.

The earlier `final-report.md` describes the audit branch before integration;
this report supersedes its CONDITIONAL verdict.

No P0 or P1 finding remains on the integration branch. The main-side mobile
documentation drawer and the audit fixes are both present, and the full
workspace suite, external tarball E2E, three deployment layouts, Chromium
suites, Firefox and WebKit smoke tests, documentation gates, and the
independent review pass.

The remaining P2 items are known limitations or process conditions, not
release blockers:

- concurrent `riebeckite build` processes in one site are unsupported and the
  loser reports an internal `ENOENT` rename error (final `dist` stays valid);
- the visual suite passes with refreshed baselines but is not wired into CI;
- npm `latest` is 0.0.38, so documentation must not be deployed before 0.0.39.

## Commits

- `feb31a49` audit fixes merged into latest `main`
- `40cef107` visual baselines refreshed with Chrome 155
- `84c9f3fc` duplicate output-collision test removed after review

The audit commits merged by `feb31a49` are `a80256a8`, `55846cc0`,
`5268b741`, `f7328eff`, `189c5817`, `07fb1f88`, `03e61926`, `0428ae47`,
`d8986a55`, `433deec4`, `8c3521d5`, plus the audit documentation.

## Conflict resolution

Only four files were changed on both sides.

1. `packages/core/src/content/output_dependency.ts`
   Kept the audit check that requires both `kind === "content"` and the exact
   self producer before a redirect is suppressed. Main's broader check could
   hide a cross-slug redirect.
2. `packages/core/test/output_dependency.test.ts`
   Kept main's folder-index canonical test and permalink helper, plus the audit
   cross-slug collision test. Removed one duplicate transition test and, after
   review, one duplicate self-redirect test.
3. `packages/plugins/search/test/browser/search-modal.test.ts`
   Kept main's `language: "en"` fixture change and the audit document-language
   plus `lang:en` assertions.
4. Integration documentation and changelog were combined.

No main-side feature, including the mobile documentation drawer and its tests,
was dropped.

## Verification

| Check | Result |
| --- | --- |
| `pnpm build:packages` | PASS: 116 built |
| `pnpm typecheck` | PASS: 3 projects |
| `pnpm check` | PASS with the known AUD-011 advisory |
| Cycles, dependencies, packages, core API, templates, scaffold | PASS |
| Docs, changes, generated docs | PASS |
| Full workspace tests | PASS: HonoX 204/204, CLI 227 pass + 1 skip, Web 48/48, all plugins |
| External tarball E2E | PASS: npm install, check/doctor/inspect/build, typecheck, init |
| Layouts A/B/C | PASS |
| Chromium suites | PASS: search 17, SPA 7, runtime 8, inspector 1, plugin-dev 3 |
| Visual regression | PASS: 28 variants after baseline refresh |
| Firefox 158 | PASS: home and note render, no console/page errors |
| WebKit 26 | PASS: home and note render, no page errors |
| Performance | 10,000 notes: cold 147.4 s, warm 34.7 s, single edit 33.3 s, peak 1.3 GB |

Details: `integration-verification.md`, `visual-regression.md`, and
`performance.md`.

## Visual regression classification

All 36 differences were stale baselines, not UI regressions:

- the baselines predate the UI foundation replacement (`93297dd9`) and later
  button, callout, table, mobile, and scrollbar changes;
- captured widths show a 15 px scrollbar delta on both desktop and mobile;
- all themes and both color modes changed together;
- capture checks reported correct TOCs, zero low-contrast text, zero overlap,
  and no horizontal overflow;
- the same embedded fonts and Chrome 155 were used for capture and comparison.

The baselines were regenerated and the suite now passes with zero differences.

## Unresolved findings

| ID | Severity | State |
| --- | --- | --- |
| AUD-002 | P3 | Conditional CI skips some expensive E2Es; mandatory tests always run |
| AUD-003 | P3 | Unused declared dependencies; Excalidraw's dynamic import is intentional |
| AUD-004 | P2 | npm `latest` is 0.0.38 while docs track `main` |
| AUD-009 | P2 | Visual suite passes but is not in CI |
| AUD-010 | P3 | D2 README lacks the SVG trust-boundary warning Graphviz has |
| AUD-011 | P3 | Public `CliCommandResult` uses `void` in a union |
| AUD-014 | P2 | Concurrent builds share staging and the loser fails with ENOENT |

## Residual risks

- Real Cloudflare Workers or GitHub Pages deployment was not performed.
- Linux CI and real mobile devices were not run. The pnpm version differs
  locally (12.15.0) from CI (11.5.3).
- Firefox and WebKit were rendering smoke tests; SPA, keyboard, and touch
  behavior remain Chromium-only.
- Performance figures are single samples on Windows.
- The visual baseline is pinned to Windows Chrome 155; CI must pin the same
  browser and runner image before it can enforce the baselines.

## Recommended main integration steps

1. Review and merge `integration/release-readiness-2026-11` into `main` through
   a pull request. Do not redo the conflict resolution; the merge commit already
   contains it.
2. Let the full CI matrix run, including the Windows and macOS jobs.
3. Run `pnpm test:visual` on a Windows runner with Chrome 155 before tagging, or
   explicitly accept that visual coverage remains local.
4. Release 0.0.39 with the repository release script, then deploy the
   documentation. Do not deploy docs before the package release.
5. Keep the concurrent-build limitation documented until a build lock or
   per-build staging directory is implemented.

`main` was not modified, and nothing was pushed, published, or deployed during
this integration.
