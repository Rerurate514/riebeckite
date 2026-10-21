# @riebeckite/preview

Shared browser-safe preview runtime for Riebeckite Markdown and selected plugins.

[日本語](./README_ja.md)

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

`createPreview` runs the published Riebeckite `PluginRuntime` and Markdown
`Pipeline`. It sanitizes the resulting HTML at the public preview boundary.

## Browser availability

Register a plugin as `browser` only after its factory and pipeline hooks have
been verified in a browser-compatible preview. `node` and `unsupported` plugins
produce diagnostics instead of being executed.

This package does not execute plugin client entries. Hosts must explicitly
allow and isolate any interactive client behavior.

## API

- `createPreview(options?)` creates an isolated stateful preview session.
- `createPreviewRegistry(input)` validates fixtures and plugin IDs.
- `definePluginPreview(preview)` preserves a typed plugin preview descriptor.
- `PreviewPlugin.options` declares boolean, string, number, and enum controls.
- `validatePreviewOptions(definitions, input)` rejects unknown and invalid values.
- `PreviewSession.render(input)` returns sanitized HTML and diagnostics.
- `PreviewSession.dispose()` disposes the underlying plugin runtime.
