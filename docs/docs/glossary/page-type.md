---
date: 2026-10-14
title: Page Type
sidebar:
  hidden: true
---

# Page Type

A kind of page that a plugin provides with its own public path and body, used for pages that are not ordinary Markdown. The integration resolves the route and the application assembles the final HTML.

## What a page type provides

- A public path for the page.
- A body the integration can render.
- Output dependencies for [incremental builds](./incremental-build.md).

## Page type boundaries

A page type does not own HonoX routes or the site shell. It declares a page; the integration and application place it. This boundary ensures that plugin page types remain framework-independent and can be composed by the integration.

Page type lifecycle:

1. **Declaration**: Plugin declares page types with `id`, `paths`, `resolve`, and optional `priority`, `directoryIndex`, `outputDependencies`
2. **Resolution**: Integration calls `pluginRuntime.resolvePage()` (`packages/core/src/plugin/plugin_runtime.ts`) to find the matching page type for a given pathname
3. **Rendering**: Application renders the plugin page through its document frame, using the `PluginPage` body and metadata
4. **Output dependencies**: If `outputDependencies` are specified, they are tracked for incremental build support

Example page type with output dependencies:

```ts
pageTypes: [
  {
    id: "tag-archive",
    paths: ["tag/*"],
    outputDependencies: ["dependencies:tag:archive"],
    resolve: async (context) => {
      const tag = context.slug.split("/")[1];
      return {
        type: "tag-archive",
        pathname: `/tags/${tag}/`,
        body: `<p>Posts tagged: ${tag}</p>`,
      };
    },
  },
],
```

Example output dependency tracking:

The `outputDependencies` are collected during SSG build and stored in the manifest. If the dependency changes (e.g., tag configuration changes), the affected pages are regenerated on the next build.
