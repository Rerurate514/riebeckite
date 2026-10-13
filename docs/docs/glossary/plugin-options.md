---
title: Plugin options
sidebar:
  hidden: true
---

# Plugin options

Plugin options are configuration values passed to a plugin factory; they are validated through a pure `validateOptions` function with no side effects, and the resolved options are available on the plugin `options` property.

## Option validation

```ts
type ExampleOptions = {
  enabled?: boolean;
};

export function examplePlugin(options: ExampleOptions = {}) {
  return definePlugin({
    name: "example",
    options,
  });
}
```

## Validator contract

Validators must have no side effects — no filesystem scanning, no builds, no cache writes, and no modification of external state. Return problems as structured issues.

## Related terms

- [[config|Config]]
- [[plugin|Plugin]]

## Learn more

- [Plugin API](../reference/plugin-api.md)
