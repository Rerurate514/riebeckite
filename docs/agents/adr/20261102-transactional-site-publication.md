# Publish site output transactionally

- **Status:** Accepted
- **Date:** 2026-11-02
- **Related Changes / PR:** `integration/release-transactional-performance`

## Context

The HonoX client build and SSG generation previously wrote directly to the public output directory. A failure after that directory was emptied could leave a deployment with partial assets or pages. SSG output also used Rollup asset emission, which made the publication boundary implicit.

## Decision

Stage client assets and SSG output below `.riebeckite/`. Route generated and reused SSG files through the existing build artifact writer, validate the staged inventory, save cache metadata, then publish the staging directory with its recovery-aware replacement operation. The configured `build.outDir` remains the only deployable directory.

The standalone bundle redirects HonoX's manifest lookup to the staged client manifest. This preserves the normal client asset links without exposing staging as public output.

## Consequences

- Failed SSG builds leave the previously published output untouched.
- Rollup no longer owns SSG page and generated-output writes.
- A successful build briefly uses additional disk space for the staged output.
