---
date: 2026-10-14
title: Build State
sidebar:
  hidden: true
---

# Build State

The record of the previous build, stored under the build directory, that holds entries, fingerprints, dependencies, and output changes.

## Location and content

Stored at `.riebeckite/build/content-state.json`.
Holds entries, fingerprints, dependencies, pipeline fingerprint, manifest entries, outputs, external dependencies, and the manifest hook cache.
The next build reads it to compute an incremental change set.

## Version and validity

Version is `CONTENT_BUILD_STATE_VERSION` (currently 19). A missing, incompatible, or malformed state causes a full build path. State is updated only after a successful build; a failed build never corrupts the previous good state. Changing the stored shape raises the version, so a state written by an older version is ignored and the build falls back to the full path.

## Build State Structure

`ContentBuildState` type at `packages/core/src/content/content_build_state.ts` contains:
- `version`: number (currently 19)
- `entries`: `Readonly<Record<string, ContentBuildEntry>>` — per-entry state including fingerprint, aliases, dependencies, link targets, and processed content cache fingerprint
- `contentIndex`: `Readonly<Record<string, string>>` — content slug to path mapping
- `pipelineFingerprint`: string | undefined — pipeline fingerprint for incremental validity checks
- `manifestEntries`: `readonly ContentManifestEntry[]` — snapshot of manifest entries from the previous build
- `outputs`: `readonly OutputDescriptor[]` — output descriptors from the previous build
- `externalDependencies`: `readonly PersistedExternalDependency[]` — external dependency snapshots
- `manifestHookCache`: `readonly ManifestHookCacheEntry[]` — one entry per manifest hook in execution order. A cacheable hook stores only the manifest entries it changed against its input, plus an `order` list when the entry order changed; a hook that also mutates non-entry manifest state stores no snapshot and always reruns.

`ContentBuildEntry` (`packages/core/src/content/content_build_state.ts`) holds:
- `fingerprint`: string — content fingerprint including source, frontmatter, pipeline, and plugin cache version
- `aliases`: `readonly string[]` — entry aliases from frontmatter
- `dependencies`: `readonly ContentBuildDependency[]` — content and file dependencies with stable identities
- `linkTargets?: ` `readonly string[]` — resolved link target slugs
- `processedContentCacheFingerprint?: ` `string` — fingerprint of the processed content cache contract

`ContentBuildDependency` (`packages/core/src/content/content_build_state.ts`) records:
- `kind`: `"content"` or `"file"`
- `id`: string — content slug or file path

On a later build, the previous state is read to compute an incremental change set. The pipeline fingerprint comparison (`previousState.pipelineFingerprint !== pipelineFingerprint`) triggers a full rebuild if the pipeline configuration has changed. State is saved only after a successful build; a failed build never corrupts the previous good state.

## Related terms

- [[build|Build]]
- [[incremental-build|Incremental Build]]
- [[fingerprint|Fingerprint]]
- [[output-inventory|Output Inventory]]

## Learn more

- [Build System](../framework/build-system.md)
