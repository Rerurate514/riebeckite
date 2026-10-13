---
title: Plugin dependency
sidebar:
  hidden: true
---

# Plugin dependency

Plugins declare capability requirements via `requires`; the resolver places providers before consumers and reports missing capabilities as `PluginDependencyError` with `kind` and `pluginName` diagnostics.

## Capability fields

`provides`: capabilities this plugin offers to others.
`requires`: mandatory capabilities that must be resolved before this plugin executes.
`optional`: capabilities used when present but not required.

## Resolution order

The resolver orders plugins by `order` first, then enforces capability dependencies. A missing required capability throws `PluginDependencyError`. Duplicate providers or cycles are configuration errors.

## Example

```ts
definePlugin({
  name: "consumer",
  requires: ["content.graph"],
});
```

```mermaid
flowchart LR
  Provider["Provider<br/>provides: content.graph"]
  Consumer["Consumer<br/>requires: content.graph"]
  Provider --> Consumer
```

## Related terms

- [[plugin|Plugin]]
- [[capability|Capability]]
- [[lifecycle-hook|Lifecycle hook]]
- [[content-hook|Content hook]]
- [[endpoint|Endpoint]]

## Learn more

- [Plugin API](../reference/plugin-api.md)
- [Plugin System](../framework/plugin-system.md)
