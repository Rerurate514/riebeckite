---
title: Content
sidebar:
  hidden: true
---

# Content

A content item after Markdown parsing and plugin processing. It carries frontmatter, rendered HTML, and a resolved public location, so Riebeckite works with the processed item rather than the raw file.

## The processed item, not the file

Riebeckite reads a file, parses it, runs it through the plugin pipeline, and resolves where it will live on the site. Everything after that point is content: the [entry](./content-entry.md), its location, and its relationships.

Code that queries content reads the [manifest](./manifest.md), not the filesystem.

## Life of a content item

1. A [Content Source](./content-source.md) discovers and reads the file.
2. The [Content Manager](./content-manager.md) parses it and runs the pipeline.
3. Location resolution assigns a [permalink](./permalink.md).
4. The item is recorded as a [Content Entry](./content-entry.md) in the manifest.

## Content processing modules

Riebeckite's content pipeline is composed of distinct modules, each with a focused responsibility:

- **`content_manager.ts`** (`packages/core/src/content/content_manager.ts`) — Orchestrates the full build flow: scanning content sources, building the content index, resolving locations, running the plugin pipeline via `Pipeline`, building the manifest and content graph, and committing incremental build state. It coordinates between the plugin runtime, content index builder, and build coordinator.

- **`content_collection.ts`** (`packages/core/src/content/content_collection.ts`) — Defines `ContentCollectionDefinition`, `ContentCollection`, and the `buildContentCollections` function that groups manifest entries into taxonomy/date/folder-based listings with pagination, sort, and filter support.

- **`content_graph.ts`** (`packages/core/src/content/content_graph.ts`) — Represents the content graph as a `ContentGraph` type with methods to query nodes, incoming/outgoing links, and neighbors. Built from the manifest's `outgoingLinks` and `incomingLinks` during `runGraphHook`.

- **`content_index_builder.ts`** (`packages/core/src/content/content_index_builder.ts`) — Builds the content resolution index that maps slug variants (including case-insensitive and alias mappings) to their canonical slug. Uses `resolveContentIndex` to collapse candidates into a single resolution, flagging ambiguities for diagnostics.

## Content manifest entry

Each content entry in the manifest is typed as `ContentManifestEntry` (`packages/core/src/types/content_manifest.ts`). Key fields include:

- **`slug`** — the internal lookup key
- **`permalink`** — the resolved canonical public URL
- **`publicLocation`** — combines slug, permalink, optional redirects, and metadata
- **`contentId`** — stable author‑written identifier in frontmatter, independent of slug/permalink
- **`frontmatter`** — `PostFrontmatter` containing `id`, `title`, `description`, `date`, `published`, `tags`, and other metadata
- **`html`** — the processed Markdown HTML body
- **`aliases`** — alternative lookup keys for the note
- **`tags`** and **`links`** — taxonomy and wikilink/MMD links collected during processing

Example entry structure:

```ts
{
  slug: "notes/hello",
  permalink: "/docs/notes/hello/",
  contentId: "abc123",
  frontmatter: {
    id: "abc123",
    title: "Hello World",
    tags: ["intro"],
  },
  html: "<p>Hello world</p>",
  tags: ["intro"],
  links: [],
  backlinks: [],
  assets: [],
}
```

## Related terms

- [[content-source|Content Source]]
- [[content-entry|Content Entry]]
- [[permalink|Permalink]]
- [[manifest|Manifest]]
- [[content-graph|Content Graph]]
- [[taxonomy|Taxonomy]]
- [[series|Series]]
