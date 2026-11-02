---
date: 2026-10-08
title: Core API
sidebar:
  label: Core API
---
# Core API

## `@riebeckite/core` が公開するもの

`@riebeckite/core` は、Riebeckite のフレームワークに依存しない公開 API を提供します。

### 主なエクスポート

- 設定: `defineConfig`、`resolveConfig`、`resolveConfigModule`、`isPublished`、`isExcluded`
- API ライフサイクル: `defineApiLifecycle`、`createApiLifecycleRegistry`、`resolveApiLifecycle`
- コンテンツ: `ContentManager`、`ContentCollection`、`ContentGraph`、`queryContentEntries`、`buildContentCollections`、`fingerprintContentEntries`、`resolveDefaultContentLocation`
- プラグイン: `definePlugin`、`resolvePlugins`、`defineEndpoint`、`createStyleAsset`、`createClientEntry`、`createPluginMemo`、`stableStringify`
- テーマ: `defineTheme`、`defineThemeSettings`、`ThemeDefinition`、`ThemeOptions`、`ThemeColorMode`
- パイプライン: `Pipeline`、`MarkdownPipeline`、`HtmlPipeline`
- ユーティリティ: `escapeHtml`、`escapeHtmlAttribute`、`normalizeTag`、`calculateReadingTime`、`stripHtml`
- 可観測性: `Logger`、`Tracer`、`TraceSpan`、`TraceSink`

### 設定

```text
defineConfig
resolveConfig
resolveConfigModule
isPublished
isExcluded
```

設定の宣言と解決、公開ポリシーに使用します。詳しくは [設定](./configuration.ja.md) を参照してください。

### API ライフサイクル

```text
defineApiLifecycle
validateApiLifecycleDefinition
createApiLifecycleRegistry
collectApiLifecycleDefinitions
resolveApiLifecycle
API_LIFECYCLE_DIAGNOSTIC_CODE
API_LIFECYCLE_METADATA_DIAGNOSTIC_CODE
```

非推奨 API の記録とメタデータの検証に使用します。詳しくは [API ライフサイクル](./api-lifecycle.ja.md) を参照してください。

### コンテンツ

```text
ContentManager
ContentCollection
ContentGraph
ContentQuery
buildContentCollections
fingerprintContentEntries
resolveDefaultContentLocation
```

コンテンツの読み込みと解決、コレクション、コンテンツグラフ、クエリ、公開ロケーションに使用します。仕組みについては [Content System](../framework/content-system.ja.md) を参照してください。

### プラグイン

```text
definePlugin
resolvePlugins
defineEndpoint
createStyleAsset
createClientEntry
createPluginMemo
stableStringify
```

プラグインの定義と解決、エンドポイントなどに使用します。プラグインを作成する場合は [Plugin API](./plugin-api.ja.md) と [プラグイン作成の詳細](../framework/plugin-system.ja.md) を参照してください。

### テーマ

```text
defineTheme
defineThemeSettings
ThemeDefinition
ThemeOptions
ThemeColorMode
```

テーマの定義とプレゼンテーションの取り決めに使用します。テーマを作成する場合は [Theme API](./theme-api.ja.md) と [テーマ作成の詳細](../framework/theme-system.ja.md) を参照してください。

### パイプライン

```text
Pipeline
MarkdownPipeline
HtmlPipeline
```

Markdown / HTML の処理パイプラインを拡張するときに使用します。通常のサイト利用で直接扱う必要はありません。

### ユーティリティ

```text
escapeHtml
escapeHtmlAttribute
normalizeTag
calculateReadingTime
stripHtml
```

プラグインやインテグレーションから利用できる共通のユーティリティです。

### 可観測性

```text
Logger
Tracer
TraceSpan
TraceSink
```

ログやトレースをフレームワークと統合するための型です。詳しくは [Observability](../framework/observability.ja.md) を参照してください。
