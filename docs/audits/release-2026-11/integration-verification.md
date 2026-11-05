# Integration verification

Integration branch: `integration/release-readiness-2026-11`
Base: `main` `54f726f3`
Merge commit: `feb31a49`

## Build and static checks

| Check | Result |
| --- | --- |
| `pnpm build:packages` | PASS: 116 built, 0 reused |
| `pnpm typecheck` | PASS: 3 projects |
| `pnpm check` | PASS with the known AUD-011 advisory in `packages/core/src/cli/types.ts:96` |
| `pnpm check:cycles` | PASS: 116 packages acyclic |
| `pnpm check:dependencies` | PASS with the known AUD-003 warnings (Excalidraw dynamic imports, og-image `hono`) |
| `pnpm check:packages` | PASS: 116 packages |
| `pnpm check:core-api` | PASS: unchanged |
| `pnpm check:docs` | PASS: 1151 files, 84 plugin pairs, 28 theme READMEs |
| `pnpm check:changes` | PASS: 5 unreleased, 3 releases |
| `pnpm check:templates` | PASS |
| `pnpm check:scaffold` | PASS |

## Targeted tests after the merge

| Suite | Result |
| --- | --- |
| core output dependency | 42/42 |
| honox content route and folder-pages SSG | 21/21 |
| CLI managed development | 4/4 |
| scaffold golden | 10/10 |
| search browser | 17/17 |

The first honox run failed only because `@riebeckite/ui` had not been built in
that worktree yet; after `pnpm build:packages` it passed.

## Full workspace tests

`pnpm -r --workspace-concurrency=1 test` exited 0.

- HonoX: 204/204, including the D2/Marp cold-versus-incremental equality test
  (189.8 s) and the folder-pages real-SSG test.
- CLI: 228 tests, 227 pass, 1 platform skip.
- Web: 48/48, including the mobile documentation drawer in light and dark mode.
- Core, folder-pages (24/24), docs (15/15), SVG optimizer (12/12), preview
  (21/21), webmention (5/5), and every other package and plugin passed.

## Visual regression

All 36 changed images were classified as stale baselines caused by the UI
foundation replacement and scrollbar-width changes, not as UI regressions. The
baselines were regenerated with the pinned Chrome 155 and the suite then passed
28/28 variants with zero changed images. Details are in
`visual-regression.md`.

## External distribution and layouts

`$env:RIEBECKITE_E2E_KEEP=1; pnpm test:e2e:external` passed after the package
rebuild race was removed. The harness packed the integration packages,
installed them with npm, ran `check`, `doctor`, `inspect`, and `build` from the
nested application directory, typechecked with bundler and NodeNext, and
created a second site with `riebeckite init`.

The three layouts were rebuilt from that kept workspace:

| Layout | Shape | Result |
| --- | --- | --- |
| A | Site and content in the same directory | PASS |
| B | `site/` and `vault/` in one Git repository | PASS |
| C | Separate content and site Git repositories | PASS |

All three reported a clean `check`, emitted `dist/index.html` and
`dist/notes/example.html`, and omitted the private note.

## Runtime checks

- **Chromium**: search 17/17, SPA 7/7, runtime 8/8, inspector 1/1, plugin-dev
  3/3.
- **HMR WebSocket**: the dev server served the site on port 5174 and a content
  edit reached the open page. The page performed a full reload rather than
  in-place Markdown HMR; the documentation only claims Vite HMR for CSS.
- **Concurrent builds**: one build succeeded and the other failed with an
  internal `ENOENT` rename error. The final `dist` stayed valid. The builds
  share a fixed staging directory (`ssg_plugin.ts:149`) and there is no build
  lock. Recorded as a P2 limitation, not data loss.
- **Firefox 158.0.1**: home and note pages rendered with the expected titles,
  headings, and links; no page or console errors.
- **WebKit 26.0**: home and note pages rendered with the expected titles,
  headings, and links; no page errors. The only console errors were the
  fixture's fake analytics host.
- **Linux and real mobile devices**: not verified.

## Performance

| Notes | Cold | Warm | Single edit | Peak RSS |
| ---: | ---: | ---: | ---: | ---: |
| 100 | 3.2 s | 0.3 s | 0.4 s | 261 MB |
| 1,000 | 13.9 s | 2.6 s | 3.0 s | 433 MB |
| 5,000 | 67.6 s | 13.2 s | 14.4 s | 728 MB |
| 10,000 | 147.4 s | 34.7 s | 33.3 s | 1,304 MB |

The 10,000-note run scales roughly 2.2–2.6× over 5,000 notes in this single
sample. No regression against the 5,000-note measurements is apparent. These
are single samples on Windows, not guarantees.

## Visual regression

All 36 changed images were classified as stale baselines caused by the UI
foundation replacement and scrollbar-width changes, not as UI regressions. The
baselines were regenerated with the pinned Chrome 155 and the suite then passed
28/28 variants with zero changed images. Details are in
`visual-regression.md`.

## Independent review

The independent reviewer passed the integration HEAD. It confirmed that
main-only files are byte-identical to `main`, audit-only files are
byte-identical to the audit tip, and the three conflict resolutions preserve
both intents. Its only finding was a duplicate self-redirect test; the audit
copy was removed, leaving the canonical main test. Core output dependency
tests then passed 41/41. Commit `84c9f3fc`.
