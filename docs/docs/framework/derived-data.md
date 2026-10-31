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

Every view has a stable `id`, a required `version`, optional `input` and `output` schemas, and an async `compute(input, context)` function. A schema is any object with `parse(value)`, so applications can use their existing validation library without Core depending on it.

Register views with a plugin's `derivedViews` array. `context.derived.resolve(view, input)` resolves a view by definition or ID. Duplicate IDs fail during plugin resolution. Recursive calls fail with the full cycle path. Concurrent requests for the same view, version, and input share one in-flight computation; errors are propagated to every caller and are never retained as successful values.

Use `context.resolve()` inside a view to call another view. A parent that calls another view is intentionally not persisted: Core cannot prove the child input remains current without rerunning it.

## Dependencies and cache

Views use the existing build-time PluginCache under a Core-owned namespace. Values are written only when the result is JSON and every dependency is tracked. Cache entries contain the view version, input fingerprint, result, and tracked dependency fingerprints. Malformed or unreadable entries are cache misses.

Track every non-input dependency before returning:

```ts
context.track({
  type: "content",
  id: "notes/release",
  fingerprint: sourceFingerprint,
});
```

`content` dependencies are rechecked against the runtime content index, and `external` dependencies are rechecked against resolved external snapshots. PluginRuntime currently treats `file` and `query` dependencies as cache misses; use `unknown` for them until their resolver is available. Use `unknown` for time, network access without an external snapshot, environment variables, randomness, or any input whose fingerprint cannot be proved. Unknown dependencies are never persisted.

For a content query, fingerprint the complete public result set, not just entries read by the computation. That includes additions, removals, frontmatter fields used by filtering or sorting, and publication transitions.

## Public data and output

Derived Views are build-only values. They are not serialized automatically and are unavailable in a Worker request. A plugin may emit a Generated Output or pass a value to a HonoX page, but it must select from `manifest.discoverableEntries` or `manifest.routableEntries` itself. Do not serialize drafts, scheduled entries, or unlisted entries unless the output has an explicit non-public boundary.

Generated outputs must still declare normal `OutputDependency` values. Derived View tracking controls the value cache; output dependencies control static-output invalidation. This separation keeps incremental output planning and the development route-manifest fast path unchanged.

## Troubleshooting

- **"already registered"**: use one globally unique, stable ID per enabled plugin set.
- **"cycle detected"**: split the computation so view calls form a directed acyclic graph.
- **Cache misses every build**: track each dependency with a fingerprint that Core can recheck, and return JSON-compatible data.
- **Stale external result**: resolve it through the external-dependency contract and track its snapshot fingerprint; do not mark it as a normal dependency by hand.
- **Need request-specific data**: resolve it in your Worker handler. Derived Views are deliberately build-time only.
