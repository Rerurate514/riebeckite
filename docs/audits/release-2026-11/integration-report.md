# Integration report

## Base and sources

- Integration base: `main` at `54f726f3` (equal to `origin/main`).
- Audit branch: `audit/release-readiness-2026-11` at `d8b3603b`.
- Integration branch: `integration/release-readiness-2026-11`.
- Merge commit: `feb31a49` ("監査修正を最新mainへ統合").

`main` had advanced by eight commits during the audit:

- `22ab3305` mobile documentation drawer
- `989decf9` package metadata expectations
- `19c8ecb6` archive output-collision test
- `5a363e99` plugin pages shadowing content routes
- `c6376b93` plugin-page transition test
- `3caceac0` folder-index inventory fix
- `4979df03` search browser locale fixture
- `54f726f3` CI rerun

The audit branch added the missing real-SSG redirect suppression, scaffold
runtime dependencies, ordinary-dev Bridge separation, inspector fixture fix,
expanded collision tests, audit records, and changelog entry.

## Conflicts and resolutions

### `packages/core/src/content/output_dependency.ts`

`main` already suppressed a redirect when the output producer was
`content:<slug>`. The audit branch additionally required the existing output to
be `kind === "content"`. The integration keeps the stricter audit condition,
which expresses the same ownership rule without relying on a producer naming
convention alone. Behaviour is unchanged for all existing cases and all
collision tests pass.

### `packages/core/test/output_dependency.test.ts`

Both branches added the same plugin-page transition test. The integration keeps
one copy, keeps `main`'s folder-index canonical-output test and `permalink`
helper, and adds the audit branch's cross-entry redirect collision test. No
assertion was removed or weakened.

### `packages/plugins/search/test/browser/search-modal.test.ts`

`main` changed the Beta fixture language from `ja` to `en`. The audit branch made
the same change and added a Japanese Gamma note plus a test for document-language
filtering and the `lang:en` override. The integration keeps both: the corrected
fixture and the new regression test.

## Main-side work preserved

The merge keeps the mobile documentation drawer (`docs-sidebar.tsx`,
`docs.test.ts`, website renderer and drawer browser tests), the CI rerun
change, and the main-side metadata/archive/search fixes.

## Verification

See `integration-verification.md` for the post-merge command matrix and
results.
