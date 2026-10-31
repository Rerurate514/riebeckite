---
date: 2026-10-31
title: Derived Data
sidebar:
  label: Derived Data
---

# Derived Data

Derived Views are named, typed asynchronous computations shared by plugins during a build. They are not Markdown sources and do not add nodes to the Content Graph.

```ts
import { defineDerivedView, definePlugin } from "@riebeckite/core";

const recentCount = defineDerivedView<{ count: number }, number>({
  id: "example.recent-count",
  version: "1",
  compute: ({ count }) => count,
});

export const example = definePlugin({
  name: "example",
  derivedViews: [recentCount],
  async setup(context) {
    const count = await context.derived.resolve(recentCount, { count: 3 });
  },
});
```

## Contract

Every view has a stable `id`, a required `version`, optional `input` and `output` schemas, and an async `compute(input, context)` function. A schema is any object with `parse(value)`, so applications can use their existing validation library without Core depending on it. Inputs may contain `Date` values; other values must be deterministic JSON-like values, arrays, or plain objects. Results remain JSON-only for persistent caching.

Register views with a plugin's `derivedViews` array. `context.derived.resolve(view, input)` resolves a view by definition or ID. Duplicate IDs fail during plugin resolution. Recursive calls fail with the full cycle path. Concurrent requests for the same view, version, and input share one in-flight computation; errors are propagated to every caller and are never retained as successful values.

Use `context.resolve()` inside a view to call another view. Child dependencies and its version are propagated to the parent, including through a cache hit. A changed child version invalidates a cached parent.

## Dependencies and cache

Views use the existing build-time PluginCache under a Core-owned namespace. Values are written only when the result is JSON and every dependency is tracked. Cache entries contain the view version, input fingerprint, result, and tracked dependency fingerprints. Malformed or unreadable entries are cache misses.

Use `context.track()` for non-input dependencies:

```ts
context.track({ type: "content", id: "notes/release" });
```

Core computes every fingerprint; callers never supply one. `content`, `external`, `file`, and `frontmatter` dependencies are rechecked against the runtime snapshot. During `planGeneratedOutputs`, `file`, `frontmatter`, and `query` dependencies are rechecked against that plan's build snapshot. Outside that phase, dependencies without a current snapshot safely miss the cache. A `content` id resolves through the content index and fingerprints its source Markdown, so body edits, renames, and retargeted aliases invalidate it. For frontmatter, set `property`. Use `unknown` for time, network access without an external snapshot, environment variables, randomness, or any input whose fingerprint cannot be proved. Unknown dependencies are never persisted.

Content queries use the existing Content Query engine and record their own dependencies:

```ts
const entries = context.query("releases", {
  pool: "discoverable",
  filter: { tags: { any: ["release"] } },
  sort: { field: "date", order: "desc" },
});
```

The definition decides which filter and sort fields participate. Core runs the query and fingerprints the complete result set, so filter fields, sort fields, membership additions and removals, publication transitions, frontmatter, rendered body, links, and backlinks are covered without a property declaration. `pool` defaults to `discoverable`; use `routable` when the output may include unlisted pages. Results are not cached when the result set cannot be fingerprinted.

A dynamic `where` predicate cannot be derived from the definition. Passing one tracks the result as `unknown`, so the value is never persisted and its generated outputs always regenerate. Express filters in the query definition instead.

External dependencies use the existing `resolveExternalDependencies` hook. A view tracks a snapshot by ID; Core reuses the result only while the current snapshot has the same fingerprint. A changed fingerprint, a missing snapshot, an `unavailable` resolution, or a duplicate external ID makes the value a cache miss. The snapshot value is not serialized into the derived cache.

## Public data and output

Derived Views are not serialized automatically. They may be resolved from a Worker request, but request-time resolution does not use the persistent cache and should stay small. Generated Output plans can resolve views through their `derived` context. A plugin that publishes a value must select from `manifest.discoverableEntries` or `manifest.routableEntries` itself. Do not serialize drafts, scheduled entries, or unlisted entries unless the output has an explicit non-public boundary.

Generated outputs may declare normal `OutputDependency` values for inputs outside a view trace. Derived View tracking controls the value cache; output dependencies control static-output invalidation. Core also attaches one `derived-view` output dependency per resolved view ID with its version, so a definition or child version change marks the owning output for regeneration even when primitive content dependencies are unchanged. Duplicate view IDs are deduplicated; referencing a view that is not registered fails the plan instead of emitting an unversioned dependency. This separation keeps incremental output planning and the development route-manifest fast path unchanged.

When a generated output is based on a view, retain its dependency trace and attach it to that output:

```ts
async planGeneratedOutputs({ derived }) {
  const result = await derived.resolveWithDependencies(recentCount, { count: 3 });
  return [{
    path: "data/recent.json",
    content: JSON.stringify(result.value),
    derivedDependencies: result.dependencies,
    derivedViewIds: result.viewIds,
  }];
}
```

Core converts tracked dependencies before persisting the output plan. Query dependencies become a fingerprinted `derived-query` output dependency, so any change to the query result regenerates the owning output; a query that cannot be fingerprinted becomes `unknown`. Merge explicit `dependencies` when the output has inputs that the view did not track, including view input or site configuration that can change the serialized value.

The bundled `hover-preview` plugin resolves its shared preview index through a derived view. It keeps its explicit global output dependency, so incremental invalidation and the serialized output are unchanged.

In development, the Inspector report includes each registered view's version, latest dependencies, cache state, recompute reason, duration, failure or cancellation state, and the generated output paths declared with `derivedViewIds`. The Derived tab renders this read-only data with search, status filtering, dependency and output details, and an explicit distinction between a view that has never run and one that ran without caching. Reading this report never resolves a view or mutates build state. Inspector data endpoints listen on loopback only and require a per-session token; requests through non-loopback bindings, hosts, origins, peers, or forwarders are rejected. Inspector data is never emitted in production output.

HonoX consumes the same generated outputs during SSG. A view-backed output participates in full, incremental, and no-change builds like any other generated output, and the emitted tree matches a clean build. The test suite covers derived SSG output that follows title changes and publication transitions, and the Inspector browser test covers the Derived tab.

## Platform and performance

The dependency snapshots use normalized paths, so file and content dependencies behave the same on Windows and Linux. CI runs Core, HonoX, CLI, and type checks on both platforms.

A cache hit revalidates only the tracked dependencies and skips `compute`. The value cache lives in the build-time PluginCache and is shared across restarts. A miss adds the input fingerprint, `compute`, and one cache write. The benchmark in `benchmarks/` measures a 1000-entry vault with one content dependency per entry; use the same conditions when comparing changes. Generated output planning additionally scans the content source once to fingerprint files, so prefer content, frontmatter, or query dependencies when a view does not need an arbitrary file.

## Troubleshooting

- **"already registered"**: use one globally unique, stable ID per enabled plugin set.
- **"cycle detected"**: split the computation so view calls form a directed acyclic graph.
- **Cache misses every build**: track each dependency with a fingerprint that Core can recheck, and return JSON-compatible data.
- **Stale external result**: resolve it through the external-dependency contract and track its snapshot fingerprint; do not mark it as a normal dependency by hand.
- **Need request-specific data**: resolve it in your Worker handler, and keep the view small because request-time resolution is uncached.
