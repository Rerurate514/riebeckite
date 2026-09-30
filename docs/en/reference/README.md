# Reference

Reference is for factual lookup: configuration keys, CLI commands, public exports, Plugin API, and Theme API. Use [Guides](../guides/README.md) when you want a task-oriented walkthrough, and [Framework](../framework/README.md) when you want internal architecture.

## Reference pages

| Page | Use it for |
| --- | --- |
| [Configuration](./configuration.md) | `riebeckite.config.ts`, roots, content, theme, plugins |
| [CLI](./cli.md) | `dev`, `check`, `doctor`, `build`, `profile`, `inspect` |
| [Plugin API](./plugin-api.md) | `definePlugin`, lifecycle hooks, assets, endpoints, diagnostics |
| [Theme API](./theme-api.md) | `defineTheme`, CSS contract, tokens, color mode, package shape |

## Public packages and imports

External plugins and themes should depend on public packages and public exports only.

| Package | Public surface |
| --- | --- |
| `@riebeckite/core` | `defineConfig`, `definePlugin`, `defineTheme`, content APIs, pipeline APIs, diagnostics, observability types |
| `@riebeckite/cli` | `riebeckite` CLI binary |
| `@riebeckite/honox` | HonoX integration and scaffolding support |
| `@riebeckite/plugin-*` | Plugin factory and documented subpath exports |
| `@riebeckite/theme-*` | Theme factory and CSS exports |

Do not import from `@riebeckite/core/src/**` or from monorepo-internal paths in external packages.

## Important core exports

- Config: `defineConfig`, `resolveConfig`, `resolveConfigModule`, `isPublished`, `isExcluded`
- Content: `ContentManager`, `ContentCollection`, `ContentGraph`, `ContentQuery`, `buildContentCollections`, `fingerprintContentEntries`, `resolveDefaultContentLocation`
- Plugins: `definePlugin`, `resolvePlugins`, `defineEndpoint`, `createPluginMemo`, `stableStringify`
- Themes: `defineTheme`, `RiebeckiteTheme`, `ThemeDesignTokens`, `ThemeColorMode`, `ThemeTypographyPreset`, `ThemeArticleLayoutPreset`
- Pipeline: `Pipeline`, `MarkdownPipeline`, `HtmlPipeline`
- Utilities: `escapeHtml`, `escapeHtmlAttribute`, `normalizeTag`, `calculateReadingTime`, `stripHtml`
- Observability: `Logger`, `Tracer`, `TraceSpan`, `TraceSink`
