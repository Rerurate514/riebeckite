---
date: 2026-10-06
title: Theme and plugins
sidebar:
  label: Theme and plugins
  order: 20
---
# Theme and plugins

## theme

`theme` accepts a theme instance returned by a theme definition. A definition
owns its styles, settings schema, and presets.

| Field | Type | Default |
| --- | --- | --- |
| `colorMode` | `"light"` \| `"dark"` \| `"system"` | `"system"` |
| `layout` | `"article"` \| `"sidebar"` \| `"full-width"` | `"article"` |
| `preset` | declared preset name | none |
| `settings` | inferred from the schema | schema defaults |
| `stylesheets` | `string[]` | `[]` |

Core validates that the theme is an instance. Unknown settings are resolved through defaults, preset, and explicit settings, and reflected through `data-rb-theme`, `data-rb-mode`, `data-rb-layout`, and `data-rb-setting-*`.

### Declared themes

A theme package exposes a factory. Pass its options and hand the result to
`theme`.

```ts
import { rerurateTheme } from "@riebeckite/theme-rerurate";

export default defineConfig({
  site: { title: "My site" },
  theme: rerurateTheme({ colorMode: "system", settings: { motion: true } }),
});
```

Theme-specific options are owned by the theme package, not by Core. See
[Theme system](../theme-api.md).

## plugins

`plugins` is an array of plugin instances. `false`, `null`, and `undefined` are
dropped, so a boolean can toggle a plugin.

```ts
plugins: [
  obsidianMarkdown(),
  enableSearch && search(),
]
```

Resolution removes disabled inputs, orders enabled plugins by `order`, and
validates capabilities. Two enabled plugins that share a `name` fail
resolution. Each plugin's `validateOptions` runs while the config is resolved.

Individual plugin options are documented in the [plugin guides](../../plugins/README.md)
and the [Plugin system](../plugin-api.md).