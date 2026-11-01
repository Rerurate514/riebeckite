---
date: 2026-10-06
title: Data Provenance
sidebar:
  label: Data Provenance
  order: 10
---
# Data Provenance

The Data Provenance System records where a build's inputs, transformations, and
outputs came from. It is observability data: it never changes which files are
generated, and a missing or invalid record never fails a build. Use it to answer
"which source produced this output?" and "what changed between these two builds?"

## Getting started

Provenance is enabled by default. Run a build and inspect the latest record:

```sh
pnpm exec riebeckite build
pnpm exec riebeckite inspect provenance
```

Narrow the report or compare it with a retained build:

```sh
pnpm exec riebeckite inspect provenance --source notes/hello.md
pnpm exec riebeckite inspect provenance --output blog/hello/index.html
pnpm exec riebeckite inspect provenance --json
pnpm exec riebeckite inspect provenance --compare <build-id>
```

There is no separate database or service. The record is stored in the existing
build state and read by the Inspector.

## Configuration

```ts
export default defineConfig({
  provenance: {
    enabled: false,
  },
});
```

`enabled` defaults to `true`. Setting it to `false` skips recording, history,
comparison data, and Inspector provenance data. It does not change build output.

## What a build owns

An explicit build resolves configuration and plugins, reads content, runs content and [[glossary/plugin|plugin]] pipelines, creates the manifest and content graph, emits registered assets and client entries, and records successful incremental state. The HonoX integration then builds the application with the generated entries.

[[glossary/build-state|Build state]] is application-scoped at `.riebeckite/build/content-state.json`. It is an optimization, not a source of truth. A missing, incompatible, or unsafe state causes an initial/full path; `--full` requests that path explicitly. State is saved only after a successful build, so a failure retains the prior valid state.

## Build provenance

Successful builds store a versioned provenance snapshot in the build state. It
uses the existing [[glossary/content-graph|Content Graph]], [[glossary/output-dependency|output dependency]] set, output change reasons,
and runtime measurements rather than calculating a second dependency graph.
It records relative source paths and fingerprints; content processing; measured
plugin hook order and duration; [[derived-data|derived-view]] cache status; and generated,
reused, or removed output descriptors. A hook's effects stay opaque unless an
existing dependency record proves a relationship. A cache hit is reuse, never
execution.

After [[honox-integration|HonoX]] finishes [[glossary/ssg|SSG]], its final output inventory adds SHA-256 fingerprints
of the actual output bytes. Artifacts without a Core output descriptor are
explicitly `unmapped`; Core-only builds have no final-byte claim. Provenance is
observability only: invalid, missing, or unwritable provenance state falls back
without affecting build output. It does not include Markdown contents, absolute
paths, or configuration secrets.

Records distinguish `measured`, `deterministic`, and `unobservable` evidence.
A derived-view cache hit is reported as reuse; an executed hook remains
`opaque` unless existing dependency data proves its input and output. The
[[framework/inspector|Inspector]] reads only this persisted snapshot and the private endpoint: it does
not rebuild content, resolve derived views, or mutate build state.

## API reference

The public API is exported from `@riebeckite/core`. It is usable from a custom
build integration, but the normal CLI path calls it for you.

```ts
import {
  appendProvenanceHistory,
  attachProvenanceArtifacts,
  compareBuildProvenance,
  createBuildProvenance,
  MAX_PROVENANCE_HISTORY,
  PROVENANCE_VERSION,
} from "@riebeckite/core";
```

```ts
createBuildProvenance(input: {
  plan: ContentBuildPlan;
  manifest: ContentManifest;
  outputChanges: OutputChangeSet;
  pluginHooks: readonly PluginHookExecution[];
  derivedViews: readonly DerivedViewInspection[];
  processed: ReadonlyMap<string, number>;
}): BuildProvenance
```

`createBuildProvenance` converts the current plan, manifest, output changes,
measured plugin hooks, derived-view inspections, and content-processing
durations into a `BuildProvenance`. It does not read content again and does not
calculate a second dependency graph.

```ts
compareBuildProvenance(
  from: BuildProvenance,
  to: BuildProvenance,
): BuildProvenanceComparison
```

The comparison reports `added`, `removed`, and `changed` IDs for sources,
transforms, outputs, and artifacts. A build ID that is not retained is not
reconstructed; the Inspector reports that the comparison is unavailable.

```ts
attachProvenanceArtifacts(
  provenance: BuildProvenance,
  input: {
    fingerprints: Readonly<Record<string, string>>;
    cacheHits: ReadonlySet<string>;
  },
): BuildProvenance
```

`attachProvenanceArtifacts` adds final output-byte fingerprints and cache status
after [[honox-integration|HonoX]] SSG. An artifact with no Core output descriptor
is `unmapped`.

```ts
appendProvenanceHistory(
  previous: readonly BuildProvenance[],
  provenance: BuildProvenance,
): readonly BuildProvenance[]
```

The result keeps the newest record and at most `MAX_PROVENANCE_HISTORY` (10)
entries. `PROVENANCE_VERSION` is the schema version stored with every record.

The record types are `BuildProvenance`, `ProvenanceSource`,
`ProvenanceTransform`, `ProvenanceOutput`, `ProvenanceArtifact`, and
`BuildProvenanceComparison`. The main fields are:

| Type | Fields |
| --- | --- |
| `BuildProvenance` | `version`, `buildId`, `sources`, `transforms`, `outputs`, optional `artifacts` |
| `ProvenanceSource` | `id`, `contentId`, `path`, `fingerprint`, `type`, `visibility`, `evidence` |
| `ProvenanceTransform` | `id`, `type`, `producer`, `inputs`, `outputs`, `status`, `evidence`, optional `sequence`, `hook`, `effect`, `durationMs` |
| `ProvenanceOutput` | `id`, `path`, `kind`, `producer`, `dependencies`, `status`, `evidence`, optional `recomputeReason` |
| `ProvenanceArtifact` | `id`, `path`, `fingerprint`, `descriptor`, `cache`, `evidence` |

## Storage and retention

The latest record and history live inside
`.riebeckite/build/content-state.json` as the `provenance` and
`provenanceHistory` fields. Build state is written only after a successful
build, so a failed build does not replace the previous record.

Provenance is intentionally not a separate artifact:

- It has no content bodies, absolute paths, environment values, or secrets.
- It is build-time state and is never copied into `dist/`.
- The latest ten records are retained; older comparison targets become
  unavailable.
- Deleting `.riebeckite/build/content-state.json` removes provenance and forces
  the next build to run without a previous record.
- The Inspector endpoint is loopback-only and requires a per-session token.
  Requests through non-loopback bindings, hosts, origins, peers, or forwarders
  are rejected.

## Integration

- [[derived-data|Derived Data]] supplies `DerivedViewInspection` records. A cache
  hit is recorded as `reused`, never as `executed`; a changed child version
  appears as a new dependency fingerprint.
- [[build-system|Build system]] owns the plan, output change set, build state, and
  incremental reuse decisions that provenance reads.
- [[content-system|Content system]] supplies source paths, fingerprints, and
  publication visibility.
- [[honox-integration|HonoX]] supplies final output-byte fingerprints and cache
  hits after SSG.
- [[publication-workflow|Publication workflow]] uses its own publication
  fingerprint for deploy decisions. Provenance is diagnostic and must not be used
  as an approval or deploy gate.
- [[reference/cli|CLI]] exposes `inspect provenance`; the [[framework/inspector|Inspector]]
  renders the same record in development.

The latest ten snapshots are retained for comparison. Use
`riebeckite inspect provenance` for a summary, or
`riebeckite inspect provenance --json` for the persisted machine-readable
record. `--source <relative-path>` and `--output <path>` filter the latest
snapshot; `--compare <build-id>` adds the deterministic record delta against a
retained snapshot; if that build id is not retained, the JSON reports that the
comparison is unavailable. The development [[framework/inspector|Inspector]]'s Provenance tab and
`/__riebeckite/inspector/provenance` endpoint expose the latest read-only
snapshot through its authenticated private server. Set
`provenance: { enabled: false }` to skip recording.

### Provenance measurement cost

`scripts/benchmark_large_vault.mjs` accepts
`RIEBECKITE_BENCH_PROVENANCE=off|on` and uses median wall-clock time across
repeated runs. One measured condition was a generated 1,000-note vault on
Windows (win32), Node v24.22.0, 5 runs per scenario, with the default content
and output caches enabled:

| Scenario | Provenance off (median, min–max) | Provenance on (median, min–max) |
| --- | --- | --- |
| Cold build | 2,358 ms (2,306–3,119) | 2,422 ms (2,383–2,596) |
| No-change warm build | 584 ms (531–933) | 747 ms (627–2,251) |
| One independent note edit | 646 ms (585–670) | 741 ms (680–1,035) |

These values describe this machine and content shape, not a performance
guarantee. Provenance is an observability cost paid after the manifest and
output plan are already known; disabling it removes recording, history, and
state serialization without changing build output.

## Error handling

Provenance is fail-open by design:

- If recording throws, Core logs a warning and continues the build without
  provenance.
- If the saved record is malformed, has an unsupported version, or does not
  match the expected shape, the build state is treated as unavailable and the
  next build takes the normal full path.
- If the state cannot be written, the build still completes; the previous valid
  state remains.
- `inspect provenance` reports `unavailable` with a reason when no valid state or
  no recorded provenance exists. It never creates state or runs a build.
- `--compare` with a build ID that is not retained returns
  `comparisonUnavailable` in JSON instead of inventing a comparison.

## Security and trust

Provenance is diagnostic output from trusted build code. It is not a security
control and must not be used to decide whether content may be published.

- Source paths are relative and normalized. Absolute workspace paths are not
  recorded.
- Content bodies, rendered HTML, configuration secrets, environment values, and
  credentials are not recorded.
- Plugin hooks are reported as `opaque` effects unless an existing dependency
  record already proves their inputs and outputs. Provenance does not introspect
  arbitrary plugin code.
- The development Inspector endpoint listens on loopback only and requires a
  per-session token. Provenance is not emitted into production output.
- A provenance record can reveal file names and build structure. Treat
  `.riebeckite/build/content-state.json` as private build state.

## Limitations

- Provenance describes a successful build. It cannot explain a build that never
  completed.
- The history is bounded to ten records; older comparisons are unavailable.
- Hook effects stay opaque when the dependency graph does not prove them.
- Core-only builds do not claim final output-byte fingerprints; artifacts are
  attached after [[honox-integration|HonoX]] SSG.
- Provenance does not replace the publication plan, approval gate, or artifact
  validation.
- A cache hit means the value was reused. It is not evidence that the producing
  code ran during this build.

## Troubleshooting

- **`inspect provenance` says "no valid build state"**: run a successful build
  first. Inspection never builds.
- **"provenance was not recorded"**: the state exists but this build ran with
  `provenance.enabled: false`, or recording failed. Check the build warning.
- **A source or output is missing from the report**: the filter only matches the
  exact relative path passed to `--source` or `--output`.
- **A comparison is unavailable**: the `--compare` build ID is older than the ten
  retained records, or the build state was deleted.
- **A plugin hook looks opaque**: that is expected unless an output dependency
  already proves the relationship. Do not infer a dependency from timing.
- **Provenance looks stale after a failed build**: state is only replaced on
  success. The last successful record is intentionally retained.

## The build flow

When a build runs, Riebeckite first resolves the configuration and the [[glossary/plugin|plugins]]
it will use.

It then reads content such as Markdown from the [[glossary/content-source|ContentSource]] and runs the
configured plugin transformations.

At this point it decides not only how to convert Markdown to HTML but also:

- which content is published
- which URL each page is published at
- how pages link to each other
- which images and files are required
- which pages and files the plugins add

From this information it generates the site-wide page information, the link
relationships, and the required assets.

Finally HonoX uses the generated information to build the whole web site.
