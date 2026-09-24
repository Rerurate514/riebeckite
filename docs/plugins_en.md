# Riebeckite Plugin Guide

Riebeckite plugins extend the content pipeline, build lifecycle, manifest, and
plugin-provided assets. A plugin is a typed object created with `definePlugin`.

See [`architecture_en.md`](./architecture_en.md) for the Core / Plugin / Feature /
Component / Infrastructure boundaries.

## Apply plugins

Add plugins to `riebeckite.config.ts`.

```ts
import { defineConfig } from "@riebeckite/core";
import { autoCardLinkPlugin } from "@riebeckite/plugin-autocardlink";
import { lightboxPlugin } from "@riebeckite/plugin-lightbox";

export default defineConfig({
  site: {
    title: "Riebeckite Blog",
    description: "An Obsidian-to-Hono Blog Framework",
    author: "Your Name",
    baseUrl: "https://my-blog.pages.dev",
    locale: "ja_JP",
  },
  plugins: [autoCardLinkPlugin(), lightboxPlugin()],
});
```

Disable a plugin by returning `false`, `null`, `undefined`, or by setting
`enabled: false`.

```ts
const enableLightbox = false;

export default defineConfig({
  // ...
  plugins: [autoCardLinkPlugin(), enableLightbox && lightboxPlugin()],
});
```

Use `order` when plugin execution order matters. Lower values run first.

```ts
definePlugin({
  name: "my-plugin",
  order: -10,
});
```

## Create a plugin

Create a package or local module that exports a plugin factory.

```ts
import { definePlugin } from "@riebeckite/core";
import type { Root } from "mdast";

export type ExamplePluginOptions = {
  className?: string;
};

export function examplePlugin(options: ExamplePluginOptions = {}) {
  const className = options.className ?? "rr-example";

  return definePlugin({
    name: "example",
    options,
    extendMarkdownPipeline: (pipeline) => {
      pipeline.use(function remarkExample() {
        return (tree: Root) => {
          // Transform the Markdown AST here.
        };
      });
    },
    assets: [
      {
        pluginName: "example",
        kind: "style",
        moduleSpecifier: "@riebeckite/plugin-example/style.css",
      },
    ],
    clientEntries: [
      {
        pluginName: "example",
        moduleSpecifier: "@riebeckite/plugin-example/client",
        exportName: "initExample",
      },
    ],
    addDiagnostics: () => [
      {
        pluginName: "example",
        severity: "info",
        message: `Example plugin uses ${className}`,
      },
    ],
  });
}
```

Options are type-safe because the factory receives a typed options object and
passes it to `definePlugin`.

## Markdown and HTML pipeline extensions

Use `extendMarkdownPipeline` for remark plugins and `extendHtmlPipeline` for
rehype plugins.

```ts
return definePlugin({
  name: "custom-html",
  extendHtmlPipeline: (pipeline) => {
    pipeline.use(rehypeCustom, { enabled: true });
  },
});
```

For simple plugins, `remarkPlugins` and `rehypePlugins` arrays can be used as
shorthand.

## Lifecycle hooks

Plugins can participate in the build lifecycle with these hooks:

- `onBuildStart(context)`
- `onConfigResolved(context)`
- `onContentLoaded(context)`
- `onPostParsed(context)`
- `onPostProcessed(context)`
- `extendContentGraph(context)`
- `onManifestCreated(context)`
- `addDiagnostics(context)`
- `onBuildEnd(context)`

Common context fields:

- `config`: resolved Riebeckite config when available
- `contentIndex`: map from content names to resolved slugs or asset paths
- `diagnostics`: shared diagnostic list

Post hooks also receive:

- `slug`
- `markdown`
- `content` for parsed/processed post hooks

Manifest hooks receive:

- `manifest`

Graph hooks receive:

- `entries`

## Content graph participation

Use `extendContentGraph` to add or update manifest entries before the manifest
indexes are built.

```ts
return definePlugin({
  name: "graph-example",
  extendContentGraph: ({ entries }) => {
    for (const entry of entries) {
      if (!entry.tags.includes("processed")) {
        entry.tags.push("processed");
      }
    }
  },
});
```

## Assets, client entries, and diagnostics

`assets` declares CSS/JS module specifiers provided by a plugin. Riebeckite
resolves `moduleSpecifier` through the host bundler, and CSS is bundled into the
app stylesheet. It does not make the browser load `/node_modules` or
`/riebeckite/plugin-assets` directly.

```ts
assets: [
  {
    pluginName: "example",
    kind: "style",
    moduleSpecifier: "@riebeckite/plugin-example/style.css",
  },
],
```

Plugins that need browser initialization declare `clientEntries`. The specified
module is included in the client bundle and the `exportName` function is called
during page initialization.

```ts
clientEntries: [
  {
    pluginName: "example",
    moduleSpecifier: "@riebeckite/plugin-example/client",
    exportName: "initExample",
  },
],
```

`addDiagnostics` returns plugin messages. Riebeckite stores them in
`manifest.diagnostics`.

```ts
addDiagnostics: () => [
  {
    pluginName: "example",
    level: "warning",
    message: "Example warning",
  },
],
```

## Plugin package template

Recommended package shape:

```text
packages/plugins/example/
├── client.ts
├── index.ts
├── package.json
├── style.css
└── src/
    ├── rehype.ts
    ├── remark.ts
    └── types.ts
```

Minimal `package.json`:

```json
{
  "name": "@riebeckite/plugin-example",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./index.ts",
  "types": "./index.ts",
  "exports": {
    ".": "./index.ts",
    "./client": "./client.ts",
    "./style.css": "./style.css"
  },
  "dependencies": {
    "@riebeckite/core": "workspace:*"
  }
}
```

When `"type": "module"` is set and TypeScript uses NodeNext module resolution,
use `.js` extensions for relative TypeScript imports:

```ts
import { rehypeExample } from "./src/rehype.js";
import type { ExampleOptions } from "./src/types.js";
```
