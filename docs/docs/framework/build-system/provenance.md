---
date: 2026-10-06
title: Provenance
sidebar:
  label: Provenance
  order: 10
---
# Provenance

## What a build owns

An explicit build resolves configuration and plugins, reads content, runs content and [[glossary/plugin|plugin]] pipelines, creates the manifest and content graph, emits registered assets and client entries, and records successful incremental state. The HonoX integration then builds the application with the generated entries.

[[glossary/build-state|Build state]] is application-scoped at `.riebeckite/build/content-state.json`. It is an optimization, not a source of truth. A missing, incompatible, or unsafe state causes an initial/full path; `--full` requests that path explicitly. State is saved only after a successful build, so a failure retains the prior valid state.

## Build provenance

Successful builds store a versioned provenance snapshot in the build state. It
uses the existing [[content-graph|content graph]], [[glossary/output-dependency|output dependency]] set, output change reasons,
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
