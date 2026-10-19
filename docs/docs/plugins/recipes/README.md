---
title: Plugin Recipes
sidebar:
  label: Plugin Recipes
  order: 0
---
# Plugin Recipes

[Writing a Plugin](../writing-a-plugin.md) builds one plugin from an empty folder to a working directive. This page is the next step: a set of small recipes for the extension points you are likely to need.

Each recipe is independent. Copy the one you need into `extensions/`, register it in `riebeckite.config.ts`, and check the result in the browser or build output. The recipes are task-oriented; the exact contracts are in the [Plugin API](../../reference/plugin-api.md).

Plugins are trusted application code. When a recipe builds HTML, it escapes untrusted values. When it emits URLs, it validates them for the context. Riebeckite does not sanitize plugin-generated HTML. See the [Security model](../../security.md).

## Before you start

The recipes assume a site created by `create-riebeckite` and a local plugin in `extensions/`. A local plugin does not need its own package.

Start with the smallest possible plugin:

```ts
import { definePlugin } from "@riebeckite/core";

export function examplePlugin() {
  return definePlugin({
    name: "example",
  });
}
```

Register it:

```ts
import { defineConfig } from "@riebeckite/core";
import { examplePlugin } from "./extensions/example";

export default defineConfig({
  plugins: [examplePlugin()],
});
```

Each recipe defines its own factory. Put it in `extensions/` and register it instead of `examplePlugin`. The `name` must be unique across enabled plugins, because it owns the plugin cache and generated output namespace.

## Recipe map

| What you need | Extension point | Recipe |
| --- | --- | --- |
| Transform Markdown or HTML | `remarkPlugins`, `rehypePlugins`, pipeline hooks | [1](./transform.md) |
| Render an embedded file | `renderers` | [2](./renderers.md) |
| Read content during the build | `onConfigResolved`, `onContentLoaded`, `onPostParsed`, `onPostProcessed`, `onManifestCreated` | [3](./content-hooks.md) |
| Change public URLs | `resolveContentLocations`, `extendContentLocations` | [4](./urls.md) |
| Add links for the graph and backlinks | `extendContentGraph` | [5](./content-graph.md) |
| Add a standalone page | `pageTypes` | [6](./pages.md) |
| Share a UI component | package export | [7](./components.md) |
| Add CSS and browser behavior | `assets`, `clientEntries` | [8](./assets-and-client-entries.md) |
| Expose JSON or another HTTP response | `endpoints` | [9](./endpoints.md) |
| Change titles, feeds, or structured data | `seo` | [10](./seo.md) |
| Report content problems | `addDiagnostics`, `inspectGeneratedHtml` | [11](./diagnostics.md) |
| Reuse derived data across builds | `cacheVersion`, `context.cache` | [12](./cache.md) |
| Write files during the build | `planGeneratedOutputs`, `context.output` | [13](./generated-files.md) |
| Control order and validate options | `provides`, `requires`, `optional`, `order`, `validateOptions` | [14](./dependencies-and-options.md) |
| Inspect build behavior | `logger`, `tracer` | [15](./logging-and-tracing.md) |

## Check each recipe

| Recipe | What to check |
| --- | --- |
| Transform | The expected markup appears in the generated HTML |
| Renderer | `![[data.csv]]` shows the preview; a plain link still works |
| Content hooks | The CLI prints the diagnostic with the plugin name |
| Locations | The new URL works and the old URL redirects |
| Graph | The related note appears as a backlink and graph neighbor |
| Page type | `/series/typescript` is generated and lists the notes |
| Component | The site imports it and renders it in the chosen slot |
| CSS and client | The stylesheet loads and the button works after the page loads |
| Endpoint | The dev server returns the expected JSON and cache header |
| SEO | The page source, sitemap, and feeds use the new metadata |
| Diagnostics | Warnings appear for the notes you expect |
| Cache | The second build reuses the cache; a content change misses it |
| Generated files | The file exists in the output with the expected content |
| Dependencies | A missing provider fails with a clear error |
| Logging | Debug messages appear only at the debug level |

Run `npm run build` for recipes that affect static output. For browser behavior, use `npm run dev` and check the console and network panel.

The testing levels in [Writing a Plugin](../writing-a-plugin.md#testing-a-plugin) apply to every recipe. For framework-level test conventions, see [Testing](../../framework/testing.md).

## Common mistakes

- Reading `manifest.entries` for published output. It includes drafts. Use `publicEntries` or `discoverableEntries`.
- Returning an empty string from a renderer for an unsupported target. Return `null` so another renderer can handle it.
- Forgetting to escape values from frontmatter, files, or remote responses.
- Passing secrets through `publicConfig`. Only that value is sent to the browser.
- Adding a transform without `processedContentCache`. The site then cannot reuse processed content.
- Assuming an endpoint becomes a static file. Use generated outputs for static export.
- Emitting a planned output without dependencies. The runtime rejects it.
- Changing a permalink without a redirect. Old links break; add a redirect if the URL was public.
- Using `order` to override a capability dependency. Providers always run first.

## Related

- [Writing a Plugin](../writing-a-plugin.md)
- [Plugin API](../../reference/plugin-api.md)
- [Plugin System](../../framework/plugin-system.md)
- [Testing](../../framework/testing.md)
- [Security model](../../security.md)
- [Accessibility](../../accessibility.md)
