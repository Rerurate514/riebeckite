---
title: Plugin configuration
sidebar:
  label: Plugin configuration
  order: 60
---

# Plugins and themes

Plugins are passed through `plugins`:

```ts
plugins: [
  obsidianMarkdown(),
  media(),
  attachment(),
]
```

You can also switch plugins conditionally. `PluginInput` treats

```text
false
null
undefined
```

as disabled plugin inputs. For example, conditional configuration such as

```ts
plugins: [
  enableAnalytics && analytics(),
]
```

is possible. During config resolution, disabled inputs are discarded, enabled plugins are ordered stably, and capability consistency is then checked.

Configuration errors are reported as `ConfigValidationError`; do not catch and hide them. Run `riebeckite check` after changes. Continue with [Plugin system](../plugin-api.md) or [Theme system](../theme-api.md) for their option contracts.
