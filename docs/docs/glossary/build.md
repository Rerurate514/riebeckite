---
title: Build
sidebar:
  hidden: true
---

# Build

The Riebeckite process that processes content, resolves locations, runs plugins, builds the manifest and graph, and writes the output.

## Build flow

1. Resolve the configuration and plugins
2. Read content such as Markdown
3. Run plugin transformations
4. Decide which pages and links are published
5. Collect site-wide information and required assets
6. Emit assets such as images and browser-side code
7. Build the web site with HonoX

## Full build vs incremental build

Use `--full` to process everything without using the previous build information.
An incremental build reuses the previous build result and processes only what changed.
The previous build information is stored in `.riebeckite/build/content-state.json`.

## Build state

Build state is application-scoped at `.riebeckite/build/content-state.json`.
It is an optimization, not a source of truth. A missing, incompatible, or unsafe state causes an initial/full path.
State is saved only after a successful build, so a failure retains the prior valid state.

## Pipeline stages and output generation

The build process processes content from reading to HTML emission through a series of pipeline stages defined in `packages/core/src/pipeline.ts` and coordinated by `ContentBuildCoordinator` in `packages/core/src/content/content_build_coordinator.ts`:

1. **Configuration and plugin resolution** — `resolveConfig` validates and merges defaults for `site`, `content`, `theme`, `plugins`, and `cache`. Plugins are ordered via `resolvePlugins` based on `provides`/`requires`/`optional` capabilities.

2. **Content reading** — Content sources (e.g., `FileSystemContentSource`) read Markdown files from the content directory.

3. **Markdown parsing and plugin transformation** — The `Pipeline` class runs the unified processor with `remark` plugins (parse, frontmatter, GFM, math, custom remarkPlugins) and `rehype` plugins (raw, slug, katex, format, stringify, custom rehypePlugins). Plugin `extendMarkdownPipeline` and `extendHtmlPipeline` hooks allow per-plugin pipeline extensions.

4. **Frontmatter extraction and content processing** — Frontmatter is extracted via `matter`/`vfile-matter`. Processed content may be cached via the persistent content cache (key composed of slug, source, frontmatter, and pipeline fingerprint). Dependencies are tracked per plugin's `dependencyMode` (`none`/`tracked`/`global`/`unsafe`).

5. **Page decision and location resolution** — Publishing status is determined by `isPublishable` using the configured `publishStrategy` (`explicit`/`selective`) and frontmatter fields (`publish`, `private`, `draft`). Permalinks are resolved via the content location resolver.

6. **Manifest and graph building** — The `ContentManager` builds the manifest entries, resolves links, and constructs the content graph (`ContentGraph`) for incoming/outgoing link queries. Collections (tags, series, archives) are built via `buildContentCollections`.

7. **Output emission** — Assets (images, client entries) are collected. HTML is emitted via the SSG (HonoX) using the resolved theme. The previous build state at `.riebeckite/build/content-state.json` enables incremental builds by tracking changed content and reusable outputs.

## Pipeline Execution

The `Pipeline` class in `packages/core/src/pipeline.ts` processes each content entry through `execute()`. It first checks the persistent content cache (`packages/core/src/content/content_persistent_cache.ts`) using a cache key composed of slug, source, frontmatter, and pipeline fingerprint. On a cache hit with no invalid dependencies, the cached frontmatter and HTML are returned immediately. If the cache is a miss or bypass, the markdown is processed through the unified pipeline with Remark and Rehype plugins for parsing, frontmatter extraction, GFM, math, and custom transformations. Link resolution records dependencies through the content dependency tracker. After processing, the result is stored in the persistent content cache with its dependencies and fingerprint for future incremental builds.

The pipeline fingerprint (`computePipelineFingerprint`) incorporates plugin configurations, content filters, and the compatibility version. Cacheability is determined by `isPersistentlyCacheable`, which checks each plugin's `processedContentCache` contract (dependencyMode: none/tracked/global/unsafe).

## Content Cache Integration

The persistent content cache at `.riebeckite/cache/content/v3` stores processed Markdown results per entry. A cache key is computed via `computeContentCacheKey` from `CacheKeyInputs` containing slug, source, normalized frontmatter, and pipeline fingerprint. Entries with mismatched schema versions (`CONTENT_CACHE_SCHEMA_VERSION`, currently 4) are treated as misses and reprocessed. The cache records logical content, file, and link dependencies (`CachedContentDependency`) that are checked on subsequent builds to determine invalidation. Cache data contains logical slugs and normalized source paths rather than workspace paths, so it can be copied to a different runner or workspace on the same operating system.

## Related terms

- [[incremental-build|Incremental Build]]
- [[build-state|Build State]]
- [[cache-invalidation|Cache Invalidation]]
- [[fingerprint|Fingerprint]]

## Learn more

- [Build System](../framework/build-system.md)
