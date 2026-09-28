# @riebeckite/core

Riebeckite の移植可能なフレームワーク契約です。設定、コンテンツソース、ContentManager、Markdown/HTML パイプライン、Plugin と Theme の契約、診断、可観測性を担います。

[English](./README.md)

## 概要

`@riebeckite/core` はコンテンツの読み込みと解釈、および拡張が依存する契約を所有します。HonoX や Vite、特定の Plugin・Theme・アプリケーションには依存しません。依存の向きは常に Core へ向かい、その逆には向かいません。

サイトは `defineConfig` で Core を設定し、[`@riebeckite/honox`](../integrations/honox/README_ja.md) のような integration がビルドを実行します。Plugin と Theme は `definePlugin`、`defineTheme` が返すただのオブジェクトです。

## インストール

```sh
npm install @riebeckite/core
```

`@riebeckite/honox`、`@riebeckite/plugin-*`、`@riebeckite/theme-*` をインストールすると、依存として一緒に入ります。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";

export default defineConfig({
  site: { title: "My notes", baseUrl: "https://example.com" },
  content: { directory: "../../content" },
});
```

コンテンツディレクトリはアプリケーションルート基準で解決します。設定項目の全体と `projectRoot` / `appRoot` / `configRoot` / `contentRoot` の解決規則は [Configuration](../../docs/ja/configuration.md) を参照してください。

## 公開 API

### 設定

- `defineConfig`、`resolveConfig`、`resolveConfigModule`、`isPublished`、`isExcluded`
- `ConfigValidationError`

### コンテンツ

- `ContentManager` — 解釈、マニフェスト、グラフ、Plugin の実行、公開 URL の解決
- `ContentSource`、`FileSystemContentSource`、`readContentSourceEntry`、`getContentSourceEntry`
- `queryContentEntries` と `ContentQuery*` のフィルタ・ソート型
- `createContentGraph`、`readOnlyContentGraph`、`buildGraphEdges`、`layoutRadialGraph`
- `resolveDefaultContentLocation`、`attachmentUrl`、コンテンツパスと拡張子のヘルパー
- `readContentBuildStateStatus`、`resolveContentBuildStatePath`

### パイプライン

- `Pipeline`、`PipelineOptions`

### Plugin

- `definePlugin`、`resolvePlugins`、`getResolvedPluginMetadata`、`PluginDependencyError`
- `defineEndpoint`、`createClientEntry`、`createStyleAsset`
- `Plugin*` のコンテキスト、アセット、エンドポイント、診断、SEO、パイプラインの型

### Theme と契約

- `defineTheme` と `Theme*` の型
- `RiebeckiteConfig`、`ResolvedRiebeckiteConfig`、`SiteConfig`、`PostContent`、`PostFrontmatter`、`PublishStrategy`

### ユーティリティと可観測性

- `uniqueStrings`、`escapeHtml`、`escapeHtmlAttribute`、`normalizeTag`、`calculateReadingTime`、`stripHtml`
- `ConsoleLogger`、`NoopLogger`、`NoopTracer`、`SinkTracer`、`CompositeTraceSink`

## 関連資料

- [Framework Reference](../../docs/ja/framework-reference.md)
- [Content System](../../docs/ja/content-system.md)
- [Plugin System](../../docs/ja/plugin-system.md) / [Theme System](../../docs/ja/theme-system.md)
- [Architecture](../../docs/ja/architecture.md)
