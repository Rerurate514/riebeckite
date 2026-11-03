---
date: 2026-10-06
title: Core API
sidebar:
  label: Core API
---
# Core API

## `@riebeckite/core`

`@riebeckite/core` provides Riebeckite's framework-independent public API.

### Important core exports

- Config: `defineConfig`, `resolveConfig`, `resolveConfigModule`, `isPublished`, `isExcluded`
- API lifecycle: `defineApiLifecycle`, `createApiLifecycleRegistry`, `resolveApiLifecycle`
- Content: `ContentManager`, `ContentCollection`, `ContentGraph`, `queryContentEntries`, `buildContentCollections`, `fingerprintContentEntries`, `resolveDefaultContentLocation`
- Plugins: `definePlugin`, `resolvePlugins`, `defineEndpoint`, `createStyleAsset`, `createClientEntry`, `createPluginMemo`, `stableStringify`
- Themes: `defineTheme`, `defineThemeSettings`, `ThemeDefinition`, `ThemeOptions`, `ThemeColorMode`
- Pipeline: `Pipeline`, `MarkdownPipeline`, `HtmlPipeline`
- Utilities: `escapeHtml`, `escapeHtmlAttribute`, `normalizeTag`, `calculateReadingTime`, `stripHtml`
- Observability: `Logger`, `Tracer`, `TraceSpan`, `TraceSink`

### Config

```text
defineConfig
resolveConfig
resolveConfigModule
isPublished
isExcluded
```

Used to declare and resolve config and for publication policy. See [Configuration](./configuration.md) for details.

### API lifecycle

```text
defineApiLifecycle
validateApiLifecycleDefinition
createApiLifecycleRegistry
collectApiLifecycleDefinitions
resolveApiLifecycle
API_LIFECYCLE_DIAGNOSTIC_CODE
API_LIFECYCLE_METADATA_DIAGNOSTIC_CODE
```

Used to record deprecated APIs and validate their metadata. See [API lifecycle](./api-lifecycle.md).

### Content

```text
ContentManager
ContentCollection
ContentGraph
ContentQuerySpec
buildContentCollections
fingerprintContentEntries
resolveDefaultContentLocation
```

Used to load and resolve content and for collections, the content graph, queries, and public locations. See [Content System](../framework/content-system.md) for the mechanics.

### Plugins

```text
definePlugin
resolvePlugins
defineEndpoint
createStyleAsset
createClientEntry
createPluginMemo
stableStringify
```

Used to define and resolve plugins, endpoints, and more. To build a plugin, see [Plugin API](./plugin-api.md) and [Plugins in Depth](../framework/plugin-system.md).

### Themes

```text
defineTheme
defineThemeSettings
ThemeDefinition
ThemeOptions
ThemeColorMode
```

Used to define themes and the presentation contract. To build a theme, see [Theme API](./theme-api.md) and [Themes in Depth](../framework/theme-system.md).

### Pipeline

```text
Pipeline
MarkdownPipeline
HtmlPipeline
```

Used to extend the Markdown/HTML processing pipeline. You do not normally need to handle these directly for ordinary site use.

### Utilities

```text
escapeHtml
escapeHtmlAttribute
normalizeTag
calculateReadingTime
stripHtml
```

Shared utilities available to plugins and integrations.

### Observability

```text
Logger
Tracer
TraceSpan
TraceSink
```

Types for integrating logging and tracing with the framework. See [Observability](../framework/observability.md) for details.
