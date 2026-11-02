---
date: 2026-10-14
title: Config
sidebar:
  hidden: true
---

# Config

The Riebeckite configuration object that controls content, publishing, plugins, themes, cache, provenance, and SPA behavior. It is validated and resolved before the build uses it.

## What it controls

| Setting | Purpose |
| --- | --- |
| `site` | Site identity and SEO defaults |
| `content.directory` | Where content is read from |
| `content.filters.publishStrategy` | The default [publish strategy](./publish-strategy.md) |
| `plugins` | Which plugins run and their options |
| `theme` | The theme and its options |
| `cache.enabled` | Whether the build caches |
| `publication` | Approval mode and durable publication state |
| `provenance` | Whether build provenance is recorded |
| `spa` | Client-side navigation behavior |

## Validated then resolved

The raw config is validated, then resolved into the form the build uses. Failures are reported before any content is processed, so misconfiguration does not corrupt output.

## Resolution

`resolveConfig` in `packages/core/src/config.ts` performs the resolution:

1. **`validateConfig`** — Checks required fields and value types/enums before any content processing begins.
2. **`resolveTheme`** — Resolves the theme instance's `colorMode`, `layout`, `preset`, `settings`, `stylesheets`, and styles against its definition.
3. **The remaining sections** — Resolves plugins, publication config, SPA options, and defaults for `site`, `content`, `cache`, and `provenance`.

The result is a `ResolvedRiebeckiteConfig` used in memory by the pipeline and content managers. Build state and caches are files under `.riebeckite/`; the resolved config itself is not stored there.

## RiebeckiteConfig interface

The config shape is defined in `packages/core/src/types/riebeckite_config.ts`:

```ts
export interface RiebeckiteConfig {
  site: SiteConfig;
  content?: {
    directory?: string;
    source?: ContentSource;
    exclude?: string[];
    filters?: {
      publishStrategy?: PublishStrategy;
    };
  };
  theme?: ThemeInput;
  plugins?: PluginInput[];
  cache?: {
    enabled?: boolean;
    directory?: string;
  };
  provenance?: {
    enabled?: boolean;
  };
  publication?: PublicationConfig;
  spa?: boolean | SpaConfig;
}
```

Required top-level field is `site`; all other sections are optional. `SiteConfig` lives in `packages/core/src/types/site_config.ts` and includes `title`, `description`, `author`, `baseUrl`, `locale`, `twitterSite`, `defaultOgImage`, and `feed`.

## Resolved config

The resolved config includes `site` with its normalized identity and feed fields; `content` with `directory`, `source`, `exclude`, and `filters.publishStrategy`; `theme` with its resolved name, color mode, layout, styles, stylesheets, and settings; resolved `plugins`; `cache` with `enabled` and `directory`; `provenance.enabled`; optional `publication`; and optional `spa`.

## Related terms

- [[glossary/theme|Theme]]
- [[glossary/plugin|Plugin]]
- [[glossary/content|Content]]
- [[glossary/build|Build]]
