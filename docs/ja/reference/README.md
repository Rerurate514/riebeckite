# Reference

Reference は、設定値、CLI、公開 API を調べるための章です。手順を知りたい場合は [Guides](../guides/README.md)、内部構造を理解したい場合は [Framework](../framework/README.md) を参照してください。

## ページ

| ページ | 内容 |
| --- | --- |
| [Configuration](./configuration.md) | `riebeckite.config.ts`、root、content、theme、plugins |
| [CLI](./cli.md) | `dev`、`check`、`doctor`、`build`、`profile`、`inspect` |
| [Plugin API](./plugin-api.md) | `definePlugin`、lifecycle hook、assets、endpoint、diagnostics |
| [Theme API](./theme-api.md) | `defineTheme`、CSS contract、token、カラーモード、package 構成 |

## 公開 package と import

外部 Plugin / Theme は、公開 package と公開 export だけに依存してください。

| Package | 公開 surface |
| --- | --- |
| `@riebeckite/core` | `defineConfig`、`definePlugin`、`defineTheme`、Content API、Pipeline API、Diagnostics、Observability 型 |
| `@riebeckite/cli` | `riebeckite` CLI binary |
| `@riebeckite/honox` | HonoX integration と scaffold support |
| `@riebeckite/plugin-*` | Plugin factory と README で説明された subpath export |
| `@riebeckite/theme-*` | Theme factory と CSS export |

外部 package から `@riebeckite/core/src/**` や monorepo 内部の path を import しないでください。

## 主な core export

- Config: `defineConfig`, `resolveConfig`, `resolveConfigModule`, `isPublished`, `isExcluded`
- Content: `ContentManager`, `ContentCollection`, `ContentGraph`, `ContentQuery`, `buildContentCollections`, `fingerprintContentEntries`, `resolveDefaultContentLocation`
- Plugins: `definePlugin`, `resolvePlugins`, `defineEndpoint`, `createPluginMemo`, `stableStringify`
- Themes: `defineTheme`, `RiebeckiteTheme`, `ThemeDesignTokens`, `ThemeColorMode`, `ThemeTypographyPreset`, `ThemeArticleLayoutPreset`
- Pipeline: `Pipeline`, `MarkdownPipeline`, `HtmlPipeline`
- Utilities: `escapeHtml`, `escapeHtmlAttribute`, `normalizeTag`, `calculateReadingTime`, `stripHtml`
- Observability: `Logger`, `Tracer`, `TraceSpan`, `TraceSink`
