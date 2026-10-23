---
date: 2026-10-14
title: Shortcode
sidebar:
  hidden: true
---

# Shortcode

A generic shortcode system using `remark-directive` syntax, supporting inline (`:name[label]{key=value}`), block (`::name[label]{key=value}`), and container (`:::name[label]{key=value}` … `:::` ) shortcodes with a built-in registry.

## Syntax overview

```md
:badge[New]{variant=success}           // inline shortcode
::kbd[Ctrl+S]                            // block leaf shortcode
:::note[Tip]{type=info} … :::           // container shortcode
```

- Inline shortcodes render as a `<span>` inside the surrounding paragraph.
- Block and container shortcodes render as a `<div>` with class `rb-shortcode rb-shortcode--<name>`.

Only names listed in `inlineShortcodes` can be used inline; built-ins opt in with `badge`, `kbd`, `link-card`, and `file`.

## Built-in shortcodes

Built-in shortcodes cover common patterns:

| Name | Kind | Inline | Attributes | Output |
|------|------|--------|------------|--------|
| `badge` | leaf | yes | label, variant/type/color, title | Inline badge |
| `kbd` | leaf | yes | label or `keys` | `<kbd>` elements |
| `note` / `callout` | leaf / container | – | label or `title`, `type`/`variant` | Callout box |
| `details` | container | – | label or `summary` | `<details>` disclosure |
| `youtube` | leaf | – | `id` or `url` | Privacy-friendly embed |
| `figure` | leaf / container | – | `src`/`url`, `alt`, `caption` | `<figure>` with image |

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { shortcodes } from "@riebeckite/plugin-shortcodes";

export default defineConfig({
  plugins: [shortcodes()],
});
```

```md
:::callout[Warning]{type=warning}
Remember to rebuild your site after changing the configuration file.
:::
```

## Custom shortcodes
Register custom shortcodes by passing a `shortcodes` option to the plugin:

```ts
import { defineConfig } from "@riebeckite/core";
import { shortcodes } from "@riebeckite/plugin-shortcodes";

export default defineConfig({
  plugins: [shortcodes({
    shortcodes: {
      ad: ({ attributes, label }) => `<div class="rb-shortcode ad">${label || "Ad"}</div>`,
    },
  })],
});
```

Custom shortcodes are merged on top of built-ins by name. Names that conflict with built-ins override the built-in renderer.

## Related terms

- [[glossary/obsidian-vault|Obsidian Vault]]
- [[tag|Tag]]
- [[callout|Callout]]
- [[sidenote|Sidenote]]
- [[backlink|Backlink]]
- [[glossary/site|Site]]
- [[glossary/ui|UI]]

## Learn more

- [Shortcodes](../plugins/shortcodes.md)
