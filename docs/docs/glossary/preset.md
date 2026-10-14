---
title: Preset
sidebar:
  hidden: true
---

# Preset

A prepared set of options applied to a config to cover a common setup. Presets bundle common plugins, themes, and settings so a site can opt in with little configuration.

## What a preset bundles

- A set of plugins for a use case, such as a blog or a docs site.
- A default theme.
- Common settings, so the site only overrides what it needs.

## Using one

A preset is spread into the [config](./config.md). The site keeps the last word, because its own options are applied after the preset.

## Preset types and sources
A preset is defined as a plugin that returns configuration when imported. Presets are typically npm packages that export a function conforming to the `PluginInput` type. The preset function receives the user's partial config and returns merged configuration.

Presets are applied in order: user config is spread last, so user options always override preset options. This means a preset can provide sensible defaults, but the site owner retains final control over all settings.

## Using a preset
A preset is spread into the [config](./config.md). The site keeps the last word, because its own options are applied after the preset.

```ts
import { riibook } from "@riebeckite/preset-riibook";
export default defineConfig({
  plugins: [riibook()],
});
```

Preset plugins can also extend the site's capabilities beyond config, such as adding endpoints, content types, or UI components. See the [plugin API](../reference/plugin-api.md) for details on how plugins integrate with the site.
