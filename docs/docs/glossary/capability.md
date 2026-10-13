---
title: Capability
sidebar:
  hidden: true
---

# Capability

A capability is a named feature that plugins can provide or require; resolution orders plugins and failures appear as structured diagnostics.

## Fields on a plugin

`provides`: list of capability names this plugin exposes.
`requires`: list of capability names this plugin must have available.
`optional`: list of capability names used when a provider exists.

## Resolution

The plugin resolver validates that all `requires` have a matching `provides` from another plugin. Duplicate providers fail. Cycles fail. Missing requirements throw `PluginDependencyError`.

## Related terms

- [[plugin|Plugin]]
- [[plugin-dependency|Plugin dependency]]
- [[lifecycle-hook|Lifecycle hook]]
- [[content-hook|Content hook]]
- [[glossary/diagnostics|Diagnostics]]

## Learn more

- [Plugin API](../reference/plugin-api.md)
- [Plugin System](../framework/plugin-system.md)
