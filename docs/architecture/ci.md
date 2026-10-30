---
date: 2026-10-18
---

# CI verification contract

## Tiers

Tier 1 runs for every pull request: formatting and static contracts, documentation parity, package and dependency metadata, selector tests, the dependency-ordered package build, type checking, and all workspace unit tests. The build job produces a one-day Ubuntu artifact. Consumers verify its format version, commit, lockfile digest, the exact Node version pinned in `.node-version`, OS, architecture, package versions, and every `dist` file digest before use.

Tier 2 is selected from the changed paths. A selector failure, an empty comparison, unknown paths, lockfiles, TypeScript configuration, scripts, GitHub Actions, or other shared configuration select the complete Tier 2 suite. Package builds are never shared between operating systems, and no jobs mutate a shared working directory.

| Change | Tier 2 contracts |
| --- | --- |
| `packages/core/**`, `packages/cli/**`, integrations | external consumer, fast path, fingerprint, preset fast path |
| plugins and themes | plugin DX, external consumer, fast path, preset fast path |
| `packages/create-riebeckite/**` | scaffold golden, external consumer, fast path, preset fast path |
| `apps/web/**` | browser and production asset integrity |
| documentation only | none; Tier 1 documentation contract remains required |
| shared, unknown, cache/build configuration | every Tier 2 contract |

Tier 3 is scheduled or manual. The weekly benchmark uses three samples, median and range output, metrics, and a retained artifact. An optional repository baseline reports deltas but never fails on a single noisy measurement.

## Operational notes

The existing `check`, `typecheck`, and `test` status names remain stable. Conditional Tier 2 jobs are intentionally skipped when their contract is not selected. Branch protection was queried during F9 and is not configured; changing repository protection is outside this repository change.

External-site tests deliberately pack and install independent temporary consumers per scenario. They are not given a shared tarball because the isolated pack/install boundary is itself the asserted contract. The shared build artifact removes the prior repeated workspace build without relaxing that boundary.
