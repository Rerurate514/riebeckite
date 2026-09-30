# @riebeckite/core

The portable framework contract for Riebeckite: configuration, content sources,
the content manager, the Markdown/HTML pipeline, plugin and theme contracts,
diagnostics, and observability.

[日本語](./README_ja.md)

## Overview

`@riebeckite/core` owns content loading and interpretation and the contracts
that extensions build against. It is intentionally free of HonoX, Vite, and any
specific plugin, theme, or application: those depend on Core, never the reverse.

A site configures Core through `defineConfig`, and a framework integration such
as [`@riebeckite/honox`](../integrations/honox/README.md) drives the build.
Plugins and themes are plain objects created by `definePlugin` and `defineTheme`.

## Installation

```sh
pnpm add @riebeckite/core
```

Core is also installed transitively by `@riebeckite/honox` and by the
`@riebeckite/plugin-*` and `@riebeckite/theme-*` packages.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";

export default defineConfig({
  site: { title: "My notes", baseUrl: "https://example.com" },
  content: { directory: "../../content" },
});
```

The content directory is resolved relative to the application root. See
[Configuration](../../docs/en/reference/configuration.md) for the full field list and the
`projectRoot` / `appRoot` / `configRoot` / `contentRoot` resolution rules.

## Public API

### Configuration

- `defineConfig`, `resolveConfig`, `resolveConfigModule`, `isPublished`,
  `isExcluded`
- `ConfigValidationError`

### Content

- `ContentManager` — interpretation, manifest, graph, plugin orchestration, and
  public-location resolution
- `ContentSource`, `FileSystemContentSource`, `readContentSourceEntry`,
  `getContentSourceEntry`
- `queryContentEntries` with the `ContentQuery*` filter and sort types
- `createContentGraph`, `readOnlyContentGraph`, `buildGraphEdges`,
  `layoutRadialGraph`
- `resolveDefaultContentLocation`, `attachmentUrl`, and the content path and
  extension helpers
- `readContentBuildStateStatus`, `resolveContentBuildStatePath`

### Pipeline

- `Pipeline`, `PipelineOptions`

### Plugins

- `definePlugin`, `resolvePlugins`, `getResolvedPluginMetadata`,
  `PluginDependencyError`
- `defineEndpoint`, `createClientEntry`, `createStyleAsset`
- Plugin context, asset, endpoint, diagnostic, SEO, and pipeline types under
  `Plugin*`

### Themes and contracts

- `defineTheme` and the `Theme*` types
- `RiebeckiteConfig`, `ResolvedRiebeckiteConfig`, `SiteConfig`,
  `PostContent`, `PostFrontmatter`, `PublishStrategy`

### Utilities and observability

- `uniqueStrings`, `escapeHtml`, `escapeHtmlAttribute`, `normalizeTag`,
  `calculateReadingTime`, `stripHtml`
- `ConsoleLogger`, `NoopLogger`, `NoopTracer`, `SinkTracer`,
  `CompositeTraceSink`

## See also

- [Framework Reference](../../docs/en/reference/README.md)
- [Content System](../../docs/en/framework/content-system.md)
- [Plugin System](../../docs/en/reference/plugin-api.md) / [Theme System](../../docs/en/reference/theme-api.md)
- [Architecture](../../docs/en/framework/architecture.md)
