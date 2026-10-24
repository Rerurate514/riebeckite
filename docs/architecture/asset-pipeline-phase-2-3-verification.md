---
title: Asset pipeline Phase 2–3 verification
---

# Asset pipeline Phase 2–3 verification

## Result

Ready for local integration. The candidate is `feat/asset-pipeline` after the
verification fixes recorded with this report.

## Evidence

- HonoX SSG was exercised from packed public artifacts with `pnpm test:e2e:external`.
  It emitted nonempty WebP and AVIF variants for both Markdown and Obsidian image
  references, rendered responsive markup, and found no private marker or asset in
  the output.
- Core tests cover transformed-output collisions and public, unlisted, draft, and
  scheduled publication boundaries. Only routable public and unlisted references
  are transformed or emitted.
- The image optimizer test covers cold, unchanged, edited, configuration-changed,
  and removed image inventories. Unchanged builds reuse cached binary variants;
  the cold and unchanged inventories and bytes are identical.
- `pnpm build:packages` passed for all 90 public packages. Core tests passed
  (337 tests) and image-optimizer tests passed (4 tests).
- After building packages on both revisions, `pnpm typecheck` reported the same
  pre-existing `TS2502` in `apps/web/scripts/build_images.ts` on the candidate
  and its `main` baseline.

## Boundaries and residual risk

Core does not import Sharp; it is confined to the image-optimizer plugin.
The external build retains existing nonfatal Vite, Lightning CSS, WaveDrom, and
bundle-size warnings. The shared `TS2502` typecheck error remains outside this
change.
