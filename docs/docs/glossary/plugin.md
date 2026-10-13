---
title: Plugin
sidebar:
  hidden: true
---

# Plugin

A Riebeckite plugin extends content interpretation, transformation, rendering, diagnostics, build-time processing, endpoints, and browser behavior through a defined contract.

## Extension points

Plugins declare capabilities via `provides`, `requires`, and `optional` to opt into the dependency-resolved pipeline.

```ts
definePlugin({
  name: "example
  provides: ["content.graph"],
  requires: ["cache"],
  optional: ["example.optional"],
});
```

Core extension points include: remark/rehype pipelines, content hooks, renderers, page types, assets, client entries, endpoints, and diagnostics.

## Lifecycle

Hooks run in resolved plugin order: `setup`, `buildStart`, content processing, `buildEnd`, and `dispose` (reverse order).

Named hooks (`onConfigResolved`, `onContentLoaded`, `onPostParsed`, `onPostProcessed`, `onManifestCreated`) participate in content phases.

## Assets and client entries

CSS is declared through `assets`; browser JavaScript through `clientEntries`. Only declare when genuinely needed.

```ts
assets: [createStyleAsset("example")],
clientEntries: [createClientEntry("example", "init", { selector: ".example" })],
```

## Related terms

- [[plugin-cache|Plugin cache]]
- [[plugin-dependency|Plugin dependency]]
- [[lifecycle-hook|Lifecycle hook]]
- [[content-hook|Content hook]]
- [[renderer|Renderer]]
- [[endpoint|Endpoint]]
- [[client-entry|Client entry]]
- [[island|Island]]
- [[slot|Body slot]]
- [[asset|Asset]]
- [[glossary/diagnostics|Diagnostics]]
- [[diagnostic-code|Diagnostic code]]

## Learn more

- [Plugin API](../reference/plugin-api.md)
- [Plugin System](../framework/plugin-system.md)
