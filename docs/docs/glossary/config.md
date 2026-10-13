---
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

2. **`resolveThemeConfig`** — Resolves the theme configuration. If the theme input is a `RiebeckiteTheme`, it extracts `name`, `config`, `styles`, `attributes`, and `userCss`. If it is a plain `ThemeConfig`, it is used as-is with defaults applied for missing fields. The result is merged into the resolved config under the `theme` key.

3. **`resolveConfig`** — The final resolution step that combines all pieces. It:
   - Calls `validateConfig` on the raw `RiebeckiteConfig`.
   - Calls `resolveThemeConfig` to resolve the theme.
   - Resolves plugins via `resolvePlugins`.
   - Sets default values for `site`, `content`, `cache`, and `theme` fields.
   - Produces a `ResolvedRiebeckiteConfig` that the pipeline and content managers use.

The resolved config lives at `.riebeckite/` during the build and includes `site`, `content`, `theme`, `plugins`, and `cache` sections. For example, the `cache` section defaults to `enabled: true` and optionally a custom `directory`. The `theme` section includes `colorMode`, `typography`, `articleLayout`, `tokens`, and `attributes`.

## Related terms

- [[glossary/theme|Theme]]
- [[glossary/plugin|Plugin]]
- [[glossary/content|Content]]
- [[glossary/build|Build]]
