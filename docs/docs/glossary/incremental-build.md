---
title: Incremental Build
sidebar:
  hidden: true
---

# Incremental Build

A build mode that regenerates only what changed, using content dependencies and the stored build state.

## Role

Avoids reprocessing unchanged content and output.
Relies on recorded dependencies and build state.

## How it works

Checks what changed since the previous build and processes only what is needed.
Previous build information is stored in `.riebeckite/build/content-state.json`.
When the previous information does not exist, cannot be used, or is determined unsafe, a full build is run.

## State safety

The same site can be generated correctly even without the speed-up information from incremental state.
A missing, incompatible, or unsafe state causes a full build path.

## Fingerprint Comparison

Incremental builds determine what changed by comparing fingerprints against the stored build state (`ContentBuildState`). The state file `.riebeckite/build/content-state.json` records per-entry fingerprints, the pipeline fingerprint, and output descriptors. On each build, the current fingerprints are compared to the stored ones:

- **Unchanged**: fingerprint matches the stored value → entry and its outputs are reused.
- **Changed**: fingerprint differs → entry is reprocessed, and dependent outputs are invalidated.

The stored state includes:

| Field | Description |
| --- | --- |
| `version` | Build state schema version (currently `12`). |
| `entries` | `Record<string, ContentBuildEntry>` — per-entry fingerprint and dependency info. |
| `pipelineFingerprint` | Hash of the content pipeline (plugins, filters, etc.). |
| `outputs` | `OutputDescriptor[]` — the last inventory of generated outputs. |
| `contentIndex` | `Record<string, string>` — slug-to-source-path mapping. |

When the state file is missing, corrupted, or has a different pipeline fingerprint, a full build is executed.

---

## Output Inventory Diff

The incremental engine produces an `OutputChangeSet` classifying every output into one of four categories:

| Category | Meaning |
| --- | --- |
| `affected` | Outputs that must be regenerated because a dependency changed. |
| `unchanged` | Outputs that can be reused because nothing relevant changed. |
| `removed` | Outputs that existed in the previous build but are no longer produced. |
| `fullRegenerationRequired` | A boolean flag indicating that external dependency failures or `unknown`-type dependencies force a complete rebuild. |

The diff is computed by `determineOutputChanges` which examines:

- Per-content fingerprint changes (from `content-state.json`).
- Tag changes (added/removed tags on entries).
- Folder path changes (e.g., moving a note to a different directory).
- External dependency scope changes.
- Removed or added content entries.

Example output change set:

```json
{
  "affected": [...],
  "unchanged": [...],
  "removed": [...],
  "fullRegenerationRequired": false,
  "candidateOutputCount": 120,
  "affectedOutputCount": 15,
  "removedOutputCount": 3,
  "unchangedOutputCount": 102
}
```

- [[build|Build]]
- [[build-state|Build State]]
- [[cache-invalidation|Cache Invalidation]]
- [[fingerprint|Fingerprint]]

## Learn more

- [Build System](../framework/build-system.md)
