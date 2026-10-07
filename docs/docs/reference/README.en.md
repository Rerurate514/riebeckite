---
title: Reference
sidebar:
  label: Reference
  order: 40
---
# Reference

Reference is for factual lookup: configuration keys, CLI commands, public exports, Plugin API, Theme API, Theme customization, and internal architecture. Use [Guides](../guides/README.en.md) when you want a task-oriented walkthrough.

## Reference pages

| Page | Use it for |
| --- | --- |
| [Configuration](./configuration.en.md) | `riebeckite.config.ts`, roots, content, theme, plugins |
| [Configuration reference](./configuration-reference.en.md) | Every `riebeckite.config.ts` field, its type, and its default |
| [CLI](./cli.en.md) | `dev`, `check`, `doctor`, `build`, `profile`, `inspect` |
| [Plugin API](./plugin-api.en.md) | `definePlugin`, lifecycle hooks, assets, endpoints, diagnostics |
| [Theme API](./theme-api.en.md) | `defineTheme`, CSS contract, tokens, color mode, package shape |

## Public packages and imports

External plugins and themes should depend on public packages and public exports only.

| Package | Public surface |
| --- | --- |
| `@riebeckite/core` | `defineConfig`, `definePlugin`, `defineTheme`, content APIs, pipeline APIs, diagnostics, observability types |
| `@riebeckite/cli` | `riebeckite` CLI binary |
| `@riebeckite/honox` | HonoX integration and scaffolding support; the `server` subpath exports the route/SSG helpers (`resolveRiebeckiteRoute`, `resolveRiebeckiteContentRequest`, `resolveRiebeckiteHomeRequest`, `contentRouteSsgParams`, `riebeniteSsgParams`), and the `ui` subpath exports the article/site UI primitives (`Article`, `ArticleBody`, `PageBody`, `ArticleContent`, `ContentSlot`, `hasSlot`, and their props) |
| `@riebeckite/test` | Test helpers (`assertGolden`, `assertGoldenJson`); the `e2e` subpath exports the packed-tarball external-site engine |
| `@riebeckite/plugin-*` | Plugin factory and documented subpath exports |
| `@riebeckite/theme-*` | Theme factory and CSS exports |

Do not import from `@riebeckite/core/src/**` or from monorepo-internal paths in external packages.

## Important core exports

- Config: `defineConfig`, `resolveConfig`, `resolveConfigModule`, `isPublished`, `isExcluded`
- Content: `ContentManager`, `ContentCollection`, `ContentGraph`, `ContentQuery`, `buildContentCollections`, `fingerprintContentEntries`, `resolveDefaultContentLocation`
- Plugins: `definePlugin`, `resolvePlugins`, `defineEndpoint`, `createStyleAsset`, `createClientEntry`, `appendContentBodySlot`, `createPluginMemo`, `stableStringify`
- Themes: `defineTheme`, `RiebeckiteTheme`, `ThemeDesignTokens`, `ThemeColorMode`, `ThemeTypographyPreset`, `ThemeArticleLayoutPreset`
- Pipeline: `Pipeline`, `MarkdownPipeline`, `HtmlPipeline`
- Utilities: `escapeHtml`, `escapeHtmlAttribute`, `normalizeTag`, `calculateReadingTime`, `stripHtml`
- Observability: `Logger`, `Tracer`, `TraceSpan`, `TraceSink`
