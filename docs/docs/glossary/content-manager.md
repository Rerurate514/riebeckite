---
title: Content Manager
sidebar:
  hidden: true
---

# Content Manager

The component that turns scanned entries into a finished manifest. It resolves public locations, runs the Markdown and plugin pipeline, and builds the content graph and query indexes.

## Responsibilities

- Resolve the public location of each entry.
- Run the Markdown and plugin pipeline over each entry.
- Build the [content graph](./content-graph.md) and [content index](./content-index.md).
- Assemble the [manifest](./manifest.md) and collect diagnostics.

## Order of work

Location resolution runs first so later hooks and pages can rely on a stable [permalink](./permalink.md). Processing follows, then the graph, then the manifest is finalized.

## What it does not do

The Content Manager does not read files. That belongs to the [Content Source](./content-source.md).

## Content manager type

The `ContentManager` class (`packages/core/src/content/content_manager.ts`) is the core orchestrator. Key methods include:

- **`getManifest()`** — builds and returns the full `ContentManifest`, resolving all locations, running the plugin pipeline, and constructing the content graph
- **`getContentLocations()`** — returns a `ReadonlyMap<string, ContentPublicLocation>` mapping each slug to its resolved public location (slug, permalink, redirects, metadata)
- **`getContentGraph()`** — returns a `ContentGraph` for querying incoming/outgoing/neighbor links
- **`getBacklinks(targetSlug)`** — returns backlinks to a given entry
- **`inspect()`** — returns an `ContentInspection` with entries, content index, and diagnostics
- **`getPagePaths()`** and **`getPageRoutes()`** — returns declared plugin page paths and routes

Example manifest entry excerpt visible through `getManifest()`:

```ts
{
  slug: "notes/hello",
  permalink: "/docs/notes/hello/",
  contentId: "abc123",
  frontmatter: { id: "abc123", title: "Hello", tags: [] },
  publishing: { routable: true, discoverable: true, status: "published" },
  html: "<p>Hello world</p>",
  tags: [],
  links: [],
  backlinks: [],
  assets: [],
}
```

The Content Manager coordinates these components internally:

- **`ContentIndexBuilder`** (`packages/core/src/content/content_index_builder.ts`) — resolves slug variants and ambiguities
- **`ContentLocationResolver`** — resolves public locations, including plugin-adjusted paths
- **`PluginRuntime`** (`packages/core/src/plugin/plugin_runtime.ts`) — runs plugin hooks (onContentLoaded, extendContentGraph, onManifestCreated, etc.)
- **`ContentBuildCoordinator`** — manages incremental build state and output change detection

## Related terms
