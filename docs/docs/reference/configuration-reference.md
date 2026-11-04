---
date: 2026-10-06
title: Configuration reference
---
# Configuration reference

This page lists every field in `riebeckite.config.ts`. For how the configuration
is resolved (filesystem roots, content selection, publishing rules), see
[Configuration](./configuration.md).

## In this section

- [Site and content](./configuration-reference/site-and-content.md)
- [Theme and plugins](./configuration-reference/theme-and-plugins.md)
- [Publication, cache, and SPA](./configuration-reference/publication-cache-spa.md)

## Writing the config file

Create `riebeckite.config.ts` at the application root and export the result of
`defineConfig`.

```ts
import { defineConfig } from "@riebeckite/core";

export default defineConfig({
  site: {
    title: "My site",
    baseUrl: "https://example.com",
  },
});
```

`defineConfig` is a type-checking helper: it returns its argument unchanged and
adds no runtime behavior. Keep `export default` as the config entry so the
integration can import it.

Riebeckite resolves the config file from `configRoot`. For the Vite integration
this defaults to the application root, and the file name defaults to
`riebeckite.config.ts`. The CLI searches parent directories from the current
directory and also accepts `riebeckite.config.js` and `riebeckite.config.mjs`.
If the file lives elsewhere or has a different name, pass `configRoot` and
`configFile` to `riebeckiteVite()`.

### Top-level sections

| Section | Required | Purpose |
| --- | --- | --- |
| `site` | Yes | Site identity and SEO defaults |
| `content` | No | Where content is read and what is published |
| `theme` | No | Appearance and design tokens |
| `plugins` | No | Content, rendering, and discovery features |
| `cache` | No | Persistent build cache |
| `publication` | No | Publication approval mode and durable state |
| `provenance` | No | Build provenance recording |
| `spa` | No | Client-side navigation, prefetch, scroll restoration, and view transitions |

Only `site` is required. Every other section falls back to the default in its
table.

## Validation

An invalid configuration section throws `ConfigValidationError`; an invalid theme preset or setting throws `ThemeSettingsValidationError`. Both list each offending path and message. Do not catch and ignore them. Run `check` after any change:

```sh
npm exec riebeckite check
```

## See also

- [Configuration](./configuration.md) — roots, content selection, publishing
- [Plugin system](./plugin-api.md) — the plugin contract
- [Theme system](./theme-api.md) — design tokens and the CSS contract
- [CLI](./cli.md) — `check`, `doctor`, and `inspect`
