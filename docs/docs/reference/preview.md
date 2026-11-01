---
date: 2026-11-01
title: Preview API
sidebar:
  label: Preview API
  order: 35
---
# Preview API

`@riebeckite/preview` renders Markdown and plugin output in a browser-safe preview. It runs the published `PluginRuntime` and Markdown pipeline, then sanitizes the resulting HTML at the preview boundary.

It does not build a site or run a plugin's client entry.

## Usage

```ts
import { codeTabs } from "@riebeckite/plugin-code-tabs";
import { createPreview, definePluginPreview } from "@riebeckite/preview";

const preview = createPreview({
  plugins: [
    definePluginPreview({
      id: "code-tabs",
      title: "Code tabs",
      availability: "browser",
      fixtures: [{ id: "basic", title: "Basic", markdown: "# Hello" }],
      options: {
        syncTabs: { type: "boolean", title: "Sync labels", default: false },
      },
      create: (options) => codeTabs(options),
    }),
  ],
});

const result = await preview.render({
  markdown: '```ts tab="TypeScript"\nconst answer = 42;\n```',
  pluginId: "code-tabs",
});
```

Pass `fixtureId` and `pageId` to `render` to change the fixture. Fixture indexes are rebuilt on each fixture change, so links never resolve against the previous fixture.

## Multi-page fixtures

A fixture can hold a small in-memory Markdown site for plugins that resolve other content.

```ts
fixtures: [{
  id: "notes",
  title: "Notes",
  markdown: "[[Guide]]",
  currentPageId: "home",
  pages: [
    { id: "home", title: "Home", path: "notes/Home.md", markdown: "[[Guide]]" },
    { id: "guide", title: "Guide", path: "notes/Guide.md", markdown: "# Guide" },
  ],
}]
```

`path` must end in `.md`. Only fixture-local content is resolved; the preview does not access external integrations or build a site.

## Browser availability

Register a plugin as `browser` only after its factory and pipeline hooks have been verified in a browser. Plugins marked `node` or `unsupported` are not executed and produce diagnostics instead.

## Embedding the UI

```ts
import { createPreview } from "@riebeckite/preview";
import {
  createPreviewSessionTransport,
  mountPreview,
} from "@riebeckite/preview/ui";

const session = createPreview();
const dispose = mountPreview(document.querySelector("[data-plugin-preview]")!, {
  themeStyles: { default: themeCss },
  pluginStyles: [],
  transport: createPreviewSessionTransport(session),
});

dispose();
await session.dispose();
```

Use `createPreviewDocument` only with sanitized preview HTML and trusted, host-owned CSS. It creates iframe content with a restrictive CSP, so embed it in a sandboxed iframe. Scripts, forms, and frame embedding are not enabled.

## API

- `createPreview(options?)` creates an isolated preview session.
- `createPreviewRegistry(input)` validates fixtures and plugin IDs.
- `definePluginPreview(preview)` preserves a typed plugin preview descriptor.
- `validatePreviewOptions(definitions, input)` rejects unknown and invalid values.
- `parsePreviewInput(input, registry)` validates an input object against a registry.
- `parsePreviewRequest(request, registry)` reads a size-bounded JSON request.
- `createPreviewDocument(options)` creates a CSP-restricted iframe document.
- `createPreviewUiController(options)` manages request state (`@riebeckite/preview/ui`).
- `mountPreview(root, options)` mounts one preview root.
- `mountThemePreview(root, options)` mounts a theme preview.
- `PreviewSession.render(input)` returns sanitized HTML and diagnostics.
- `PreviewSession.dispose()` disposes the runtime.

## See also

- [Published packages](./packages.md)
- [Plugin API](./plugin-api.md)
- [Writing a plugin](../plugins/writing-a-plugin.md)
