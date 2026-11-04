---
date: 2026-10-31
title: Derived Data
sidebar:
  label: Derived Data
---

# Derived Data

A Derived View is a named, typed, asynchronous computation that plugins share during a build. It is not a Markdown source and does not add nodes to the [[glossary/content-graph|Content Graph]]. The values it produces are the derived data that Core caches and reuses across builds.

## When to use one

| You need to… | Use |
| --- | --- |
| compute a value once, for one plugin, with no cache | plain code in `setup` |
| share a value between plugins | a Derived View |
| reuse a value across builds and invalidate it when content changes | a Derived View |
| return data for a single request | resolve it in the Worker handler (not cached) |

There is no reason to use a view for one-off work that nothing else reads. The registry, cache, and dependency tracking all cost something.

## Quick start

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

Register the view in the plugin's `derivedViews` array. Resolve it with `context.derived.resolve(view, input)`, passing either the definition or its ID.

## Terms

| Name | What it is |
| --- | --- |
| Derived View | the computation you define |
| derived dependency | an input a view tracked while computing |
| `derivedDependencies` | the trace you pass from a view to a generated output |
| `derivedViewIds` | the view IDs that output depends on |
| `derived-view`, `derived-query` | output dependency types used for invalidation |

## The contract

- `id` — stable and globally unique. Duplicate IDs fail when plugins are resolved.
- `version` — required. It is stored with the cache entry and in output dependencies. Change it to invalidate every cached result for the view.
- `input` / `output` — optional schemas. Any object with `parse(value)` works; Core does not depend on a validation library. For example, a Zod schema works as-is.
- `compute(input, context)` — may be async.
- Inputs may contain `Date`. Everything else must be a deterministic JSON-like value, an array, or a plain object.
- Results must be JSON-only, because they may be persisted for [[glossary/persistent-cache|persistent caching]].

### Calling another view

Use `context.resolve()` inside `compute`. Child dependencies and the child version are propagated to the parent, including through a cache hit. A changed child version invalidates a cached parent.

### Concurrent calls

Concurrent requests for the same view, version, and input share one in-flight computation. Errors go to every caller and are never retained as a successful value. A recursive call fails with the full cycle path.

## Dependencies

Core caches a result only when it can re-check every input. Declare inputs with `context.track()` or `context.query()`.

### `context.track()`

```ts
context.track({ type: "content", id: "notes/release" });
```

| Type | Tracks |
| --- | --- |
| `content` | one content entry. Resolved through the [[glossary/content-index|content index]] and fingerprinted from its source Markdown, so body edits, renames, and retargeted aliases invalidate it. |
| `frontmatter` | one frontmatter property. Set `property`. |
| `file` | one build file. |
| `external` | an external snapshot. See below. |
| `unknown` | anything Core cannot prove. Never persisted. |

Core computes every fingerprint; never supply one yourself. `content`, `external`, `file`, and `frontmatter` are rechecked against the runtime snapshot. During `planGeneratedOutputs`, `file`, `frontmatter`, and `query` are also rechecked against that plan's build snapshot. Outside that phase there is no snapshot to compare against, so the cache misses.

Use `unknown` for time, network access without an external snapshot, environment variables, randomness, or any input whose fingerprint cannot be proved.

### `context.query()`

```ts
const entries = context.query("releases", {
  pool: "discoverable",
  filter: { tags: { any: ["release"] } },
  sort: { field: "date", order: "desc" },
});
```

The definition decides which filter and sort fields participate. Core runs the query and fingerprints the complete result set, so membership changes, [[glossary/visibility|publication]] transitions, frontmatter, rendered body, links, and [[glossary/backlink|backlinks]] are covered without extra declarations. `pool` defaults to `discoverable`; use `routable` when the output may include unlisted pages.

A dynamic `where` predicate cannot be derived from the definition. Passing one tracks the result as `unknown`, so the value is never persisted and its [[glossary/generated-output|generated outputs]] always regenerate. Express filters in the query definition instead.

### External dependencies

Use the existing `resolveExternalDependencies` hook. A view tracks a snapshot by ID and reuses the result only while the current snapshot has the same fingerprint. A changed fingerprint, a missing snapshot, an `unavailable` resolution, or a duplicate external ID is a cache miss. The snapshot value itself is not serialized into the derived cache.

## What gets cached

The value cache lives in the build-time [[glossary/plugin-cache|PluginCache]] under a Core-owned namespace. An entry stores the view version, the input fingerprint, the result, and the fingerprint of every tracked dependency. Malformed or unreadable entries are treated as misses.

A hit revalidates only the tracked dependencies and skips `compute`. A miss adds the input fingerprint, `compute`, and one cache write. Values are written only when the result is JSON and every dependency is tracked.

:::note[Why a view misses every build]{type=info}
An untracked input, a non-JSON result, or an `unknown` dependency all disable persistence. The view still returns the right value; it just recomputes every time.
:::

## Publishing the value

Derived Views are not serialized automatically. Generated Output plans resolve views through their `derived` context:

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

`resolveWithDependencies` returns `{ value, dependencies, viewIds }`. Pass that trace through to the output; do not rebuild it by hand.

:::callout[Warning]{type=warning}
A Derived View does not filter by publication state. Select entries from `manifest.discoverableEntries` or `manifest.routableEntries` yourself. Do not serialize [[glossary/draft|drafts]], scheduled entries, or [[glossary/unlisted|unlisted]] entries unless the output has an explicit non-public boundary.
:::

### Output dependencies

Derived View tracking controls the value cache. Output dependencies control static-output invalidation. They are separate.

- Core adds one `derived-view` output dependency per resolved view ID, with its version. A definition or child version change regenerates the owning output even when primitive content dependencies are unchanged.
- Tracked query dependencies become `derived-query` output dependencies with a fingerprint, so any change to the query result regenerates the output. A query that cannot be fingerprinted becomes `unknown`.
- Duplicate IDs in `derivedViewIds` are deduplicated. Referencing a view that is not registered fails the plan instead of emitting an unversioned dependency.

Add normal `dependencies` for inputs the view did not track, such as view input or site configuration that changes the serialized value.

The bundled [[plugins/hover-preview|hover-preview]] plugin resolves its shared preview index through a derived view and keeps its explicit global output dependency.

## Debugging

In development, the [[framework/inspector|Inspector]] reports each registered view's version, latest dependencies, cache state, recompute reason, duration, failure or cancellation state, and the output paths declared with `derivedViewIds`. The Derived tab lets you search, filter by status, and inspect dependencies. It distinguishes a view that has never run from one that ran without caching. Reading the report never resolves a view or mutates [[glossary/build-state|build state]]. Inspector data is never emitted in production output. Inspector endpoints and their security model are documented in [[framework/inspector|Inspector]].

The same build snapshot feeds [[build-system/provenance|Data Provenance]], which persists each view's version, dependencies, and cache status alongside sources and outputs. Use `riebeckite inspect provenance` for the build-level record.

## Production builds

[[honox-integration|HonoX]] consumes the same generated outputs during [[glossary/ssg|SSG]]. A view-backed output participates in full, [[glossary/incremental-build|incremental]], and no-change builds like any other generated output, and the emitted tree matches a clean build.

Request-time resolution from a Worker does not use the persistent cache. Keep request-time views small.

## API reference

```ts
import {
  createDerivedViewRegistry,
  defineDerivedView,
  derivedDependenciesToOutputDependencies,
  type DerivedViewRegistry,
} from "@riebeckite/core";
```

| API | Purpose |
| --- | --- |
| `defineDerivedView<TInput, TResult>({ id, version, input?, output?, compute })` | Declare a view. |
| `context.derived` | The registry in plugin contexts. `resolve` and `resolveWithDependencies` work as below. It is required in lifecycle hooks and generated-output planning, and optional in other hook contexts. |
| `registry.resolve(view, input, { signal? })` | Resolve by definition or ID and return the value. |
| `registry.resolveWithDependencies(view, input)` | Return `{ value, dependencies, viewIds }` for output planning. |
| `createDerivedViewRegistry(options?)` | Create a registry. Options supply the PluginCache, query entries, and dependency fingerprint. |
| `registry.register(view)` | Register a view. A duplicate ID throws. |
| `registry.versionOf(id)` | Return the registered version, or `undefined`. |
| `registry.inspect()` | Return the latest execution records without re-running a view. |
| `registry.status()` | Return `{ id, version, pending }` for each view. |
| `registry.dispose()` | Abort pending work and clear pending consumers. |
| `derivedDependenciesToOutputDependencies(deps)` | Convert tracked dependencies into output dependencies. |

## Troubleshooting

- **"already registered"** — use one globally unique, stable ID per enabled plugin set.
- **"cycle detected"** — split the computation so view calls form a directed acyclic graph.
- **Cache misses every build** — track each dependency with a [[glossary/fingerprint|fingerprint]] that Core can recheck, return JSON-compatible data, and avoid `unknown`.
- **Stale external result** — resolve it through the external-dependency contract and track its snapshot fingerprint; do not mark it as a normal dependency by hand.
- **Need request-specific data** — resolve it in your Worker handler and keep the view small, because request-time resolution is uncached.

## Performance

A hit revalidates only the tracked dependencies and skips `compute`. The value cache is shared across restarts.

Output planning scans the [[glossary/content-source|content source]] once to fingerprint files, so prefer `content`, `frontmatter`, or `query` dependencies when a view does not need an arbitrary file. The benchmark in `benchmarks/` measures a 1000-entry vault with one content dependency per entry; use the same conditions when comparing changes.

Dependency snapshots use normalized paths, so file and content dependencies behave the same on Windows and Linux. CI runs Core, HonoX, CLI, and type checks on both platforms.
