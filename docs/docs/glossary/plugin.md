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

## Capability system (`provides`/`requires`/`optional`)

Plugins declare capabilities via `provides`, `requires`, and `optional` to opt into the dependency-resolved pipeline. The `resolvePlugins` function processes plugins in order of their `order` field, then resolves dependencies so that plugins providing a capability are ordered before plugins that require it. If no provider exists for a required capability, resolution fails with a diagnostic.

```ts
definePlugin({
  name: "example",
  provides: ["content.graph"],
  requires: ["cache"],
  optional: ["example.optional"],
});
```

- **`provides`**: Capabilities this plugin offers to the pipeline. A capability must have exactly one enabled provider; duplicate providers fail resolution.
- **`requires`**: Capabilities this plugin depends on. Resolution orders each provider before this plugin and fails with a diagnostic when none is available.
- **`optional`**: Capabilities this plugin uses when available. A missing capability is ignored, while a present provider is still ordered before this plugin.

The `getResolvedPluginMetadata` utility exposes each plugin's resolved provides/requires/optional as `ResolvedPluginMetadata`, which the pipeline uses for ordering and diagnostics.

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
