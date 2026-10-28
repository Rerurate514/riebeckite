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

Pass `fixtureId` and `pageId` to `render` to change fixture content. Fixture
indexes are rebuilt on each fixture change, so links never resolve against the
previous fixture.

## Multi-page fixtures

Fixtures can include a small, in-memory Markdown site for plugins that resolve
other content. Set `currentPageId` for the default page, then pass `pageId` to
`render` to preview another page. Paths must end in `.md` and are used for
content lookup and permalink resolution.

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

This supports only fixture-local content. It does not execute client entries,
build a site, or access external integrations.

## Browser availability

Register a plugin as `browser` only after its factory and pipeline hooks have
been verified in a browser-compatible preview. `node` and `unsupported` plugins
produce diagnostics instead of being executed.

This package does not execute plugin client entries. Hosts must explicitly
allow and isolate any interactive client behavior.

## Document and UI

Use `createPreviewDocument` only with sanitized preview HTML and trusted,
host-owned CSS. It creates iframe content with a restrictive CSP; embed it in a
sandboxed iframe (as `mountPreview` does). Scripts, forms, and frame embedding
are not enabled. External HTTPS images and data images remain allowed by the
CSP.

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

// On page teardown:
dispose();
await session.dispose();
```

`transport` is explicit: it can render locally as above, return static fixture
results, or call a host API. The legacy `endpoint` option still defaults to
`/api/playground` when no transport is supplied. Changing theme or color mode
updates the iframe document without rerunning Markdown rendering. `light`,
`dark`, and `system` modes are supported.

## API

- `createPreview(options?)` creates an isolated stateful preview session.
- `createPreviewRegistry(input)` validates fixtures and plugin IDs.
- `definePluginPreview(preview)` preserves a typed plugin preview descriptor.
- `PreviewPlugin.options` declares boolean, string, number, and enum controls.
- `PreviewPlugin.modes` describes supported static, site, client, build, or integration modes.
- `validatePreviewOptions(definitions, input)` rejects unknown and invalid values.
- `parsePreviewInput(input, registry)` validates a preview input object against a registry.
- `parsePreviewRequest(request, registry)` reads and validates a size-bounded JSON request.
- `createPreviewDocument(options)` creates a CSP-restricted iframe document from sanitized HTML and trusted host styles.
- `@riebeckite/preview/ui` exports `createPreviewUiController(options)` for request state, `createPreviewSessionTransport(session)` for local rendering, and `mountPreview(root, options)` for one preview root. Each returns a disposal path where applicable.
- `mountThemePreview(root, options)` builds on `mountPreview` with host-supplied theme schemas, styles, fixtures, settings controls, viewport controls, reset, and configuration output. It does not include official themes or CSS.
- `initPluginPreviews(options)` remains a legacy DOM-discovery helper and now returns a disposer for its observer and mounted roots.
- `PreviewSession.render(input)` returns sanitized HTML and diagnostics.
- `PreviewSession.dispose()` disposes the underlying plugin runtime.
