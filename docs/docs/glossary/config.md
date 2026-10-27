---
date: 2026-10-14
title: Config
sidebar:
  hidden: true
---

# Config

The Riebeckite configuration object that controls content, publishing, plugins, themes, and cache behavior. It is validated and resolved before the build uses it.

## What it controls

| Setting | Purpose |
| --- | --- |
| `content.directory` | Where content is read from |
| `content.filters.publishStrategy` | The default [publish strategy](./publish-strategy.md) |
| `plugins` | Which plugins run and their options |
| `theme` | The theme and its options |
| `cache.enabled` | Whether the build caches |

## Validated then resolved

The raw config is validated, then resolved into the form the build uses. Failures are reported before any content is processed, so misconfiguration does not corrupt output.

## Resolution pipeline

The configuration goes through three stages before the build uses it:

1. **`validateConfig`** — Checks that all required fields are present and that values conform to expected types/enums. Reports errors before any content processing begins.

2. **`resolveThemeOptions`** — Resolves the theme configuration. If the theme input is a `ThemeDefinition`, it extracts `name`, `config`, `styles`, `attributes`, and `stylesheets`. If it is a plain `ThemeOptions`, it is used as-is with defaults applied for missing fields. The result is merged into the resolved config under the `theme` key.

3. **`resolveConfig`** — The final resolution step that combines all pieces. It:
   - Calls `validateConfig` on the raw `RiebeckiteConfig`.
   - Calls `resolveThemeOptions` to resolve the theme.
   - Resolves plugins via `resolvePlugins`.
   - Sets default values for `site`, `content`, `cache`, and `theme` fields.
   - Produces a `ResolvedRiebeckiteConfig` that the pipeline and content managers use.

The resolved config lives at `.riebeckite/` during the build and includes `site`, `content`, `theme`, `plugins`, and `cache` sections. For example, the `cache` section defaults to `enabled: true` and optionally a custom `directory`. The `theme` section includes `colorMode`, `typography`, `layout`, `tokens`, and `attributes`.

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
}
```

Required top-level field is `site`; all other sections are optional. `SiteConfig` lives in `packages/core/src/types/site_config.ts` and includes `title`, `description`, `author`, `baseUrl`, `locale`, `twitterSite`, `defaultOgImage`, and `feed`.

## Config resolution pipeline
The raw config passes through three resolution stages before the build uses it, defined in `packages/core/src/config.ts`:

1. **`validateConfig`** — Checks that all required fields are present and that values conform to expected types/enums. Reports errors before any content processing begins.
2. **`resolveThemeOptions`** — Resolves the theme configuration. If the theme input is a `ThemeDefinition`, it extracts `name`, `config`, `styles`, `attributes`, and `stylesheets`. If it is a plain `ThemeOptions`, it is used as-is with defaults applied for missing fields.
3. **`resolveConfig`** — The final resolution step that combines all pieces. It calls `validateConfig` on the raw `RiebeckiteConfig`, calls `resolveThemeOptions` to resolve the theme, resolves plugins via `resolvePlugins`, sets default values for `site`, `content`, `cache`, and `theme` fields, and produces a `ResolvedRiebeckiteConfig` that the pipeline and content managers use.

The resolved config includes `site` with `title`, `description`, `author`, `baseUrl`, `locale`, `twitterSite`, `defaultOgImage`, and `feed`; `content` with `directory`, `source`, `exclude`, and `filters.publishStrategy`; `theme` with resolved color mode, typography, article layout, tokens, and attributes; `plugins` resolved from the config list; and `cache` with `enabled` and `directory`.

## Related terms

- [[glossary/theme|Theme]]
- [[glossary/plugin|Plugin]]
- [[glossary/content|Content]]
- [[glossary/build|Build]]
