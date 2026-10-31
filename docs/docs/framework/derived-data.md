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

Track every non-input dependency before returning:

```ts
context.track({
  type: "content",
  id: "notes/release",
  fingerprint: sourceFingerprint,
});
```

`content` and `external` dependencies are rechecked whenever a runtime snapshot is available. During `planGeneratedOutputs`, `file`, `frontmatter`, qualified `query`, and `graph` dependencies are also rechecked against that plan's build snapshot. Outside that planning phase, dependencies without a current snapshot safely miss the cache. For frontmatter, set `property`; for a query, declare every property that controls its result set. File additions, removals, and content changes; discoverable query membership changes; and graph edge changes invalidate cached values. An unqualified query is not cacheable. Use `unknown` for time, network access without an external snapshot, environment variables, randomness, or any input whose fingerprint cannot be proved. Unknown dependencies are never persisted.

For a content query, fingerprint the complete public result set, not just entries read by the computation. That includes additions, removals, frontmatter fields used by filtering or sorting, and publication transitions.

## Public data and output

Derived Views are not serialized automatically. They may be resolved from a Worker request, but request-time resolution does not use the persistent cache and should stay small. Generated Output plans can resolve views through their `derived` context. A plugin that publishes a value must select from `manifest.discoverableEntries` or `manifest.routableEntries` itself. Do not serialize drafts, scheduled entries, or unlisted entries unless the output has an explicit non-public boundary.

Generated outputs may declare normal `OutputDependency` values for inputs outside a view trace. Derived View tracking controls the value cache; output dependencies control static-output invalidation. This separation keeps incremental output planning and the development route-manifest fast path unchanged.

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

Core converts tracked content, file, external, qualified query, and graph dependencies to existing output dependencies before persisting the output plan. A query without its complete tracked property set becomes `unknown` and safely requires regeneration. Merge explicit `dependencies` when the output has inputs that the view did not track, including view input or site configuration that can change the serialized value.

The bundled `hover-preview` plugin resolves its shared preview index through a derived view. It keeps its explicit global output dependency, so incremental invalidation and the serialized output are unchanged.

In development, the Inspector report includes each registered view's version, latest dependencies, cache state, recompute reason, duration, failure or cancellation state, and the generated output paths declared with `derivedViewIds`. Reading this report never resolves a view or mutates build state.

## Troubleshooting

- **"already registered"**: use one globally unique, stable ID per enabled plugin set.
- **"cycle detected"**: split the computation so view calls form a directed acyclic graph.
- **Cache misses every build**: track each dependency with a fingerprint that Core can recheck, and return JSON-compatible data.
- **Stale external result**: resolve it through the external-dependency contract and track its snapshot fingerprint; do not mark it as a normal dependency by hand.
- **Need request-specific data**: resolve it in your Worker handler, and keep the view small because request-time resolution is uncached.
