---
date: 2026-10-14
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

## Error kinds
`PluginDependencyError` reports five kinds of capability problems:

- `missing-capability` — a plugin `requires` a capability no other plugin provides. The error lists available capabilities from other plugins.
- `duplicate-provider` — multiple plugins declare the same capability via `provides`. The error lists the conflicting plugin names.
- `self-dependency` — a plugin `requires` a capability it also declares via `provides`.
- `invalid-capability` — a plugin declares an empty or whitespace-only capability name in `provides`, `requires`, or `optional`.
- `cycle` — a circular dependency exists across plugin `requires`/`provides` chains.

## Example
```ts
definePlugin({
  name: "consumer",
  requires: ["content.graph"],
});
```
```
## Resolution detail
The resolver first gathers all `provides` declarations, validates no empty names, and checks for duplicates. Then it collects `requires` and `optional` dependencies per plugin. A missing required capability throws `PluginDependencyError` with `kind: "missing-capability"`. Duplicate providers throw with `kind: "duplicate-provider"`. Self-dependencies throw with `kind: "self-dependency"`. Empty capability names throw with `kind: "invalid-capability"`. Cycles thrown with `kind: "cycle"` and the capability name and plugin chain included.
```

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
