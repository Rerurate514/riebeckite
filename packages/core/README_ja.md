# @riebeckite/core

Riebeckite の移植可能なフレームワーク本体です。設定、コンテンツソース、ContentManager、Markdown/HTML パイプライン、Plugin と Theme の拡張の約束、診断、可観測性を担います。

[English](./README.md)

## 概要

`@riebeckite/core` はコンテンツの読み込みと解釈、および拡張が依存する取り決めを所有します。HonoX や Vite、特定の Plugin・Theme・アプリケーションには依存しません。依存の向きは常に Core へ向かい、その逆には向かいません。

サイトは `defineConfig` で Core を設定し、[`@riebeckite/honox`](../integrations/honox/README_ja.md) のような integration がビルドを実行します。Plugin と Theme は `definePlugin`、`defineTheme` が返すただのオブジェクトです。

## インストール

```sh
pnpm add @riebeckite/core
```

`@riebeckite/honox`、`@riebeckite/plugin-*`、`@riebeckite/theme-*` をインストールすると、依存として一緒に入ります。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";

export default defineConfig({
  site: { title: "My notes", baseUrl: "https://example.com" },
  content: { directory: "content" },
});
```

コンテンツディレクトリはアプリケーションルート基準で解決します。設定項目の全体と `projectRoot` / `appRoot` / `configRoot` / `contentRoot` の解決規則は [Configuration](../../docs/docs/reference/configuration.ja.md) を参照してください。

## Markdown HTML の安全性

Core は Plugin の rehype 変換より前に、Markdown 由来の HTML をサニタイズします。安全な構造的 HTML、class、`data-*` 属性は維持しますが、script、イベント属性、安全でない URL スキーム、iframe、安全でない SVG/MathML は除去します。Plugin の rehype 変換が出力する HTML は信頼済みとして扱い、ここではサニタイズしません。Framework の renderer が `PostContent.html` を HTML として挿入できるのは、ここが Core の Markdown 境界だからです。Plugin のページ HTML と Plugin コードは信頼済み拡張の境界であり、このパイプラインではサニタイズしません。

## 公開 API

### 設定

- `defineConfig`、`resolveConfig`、`resolveConfigModule`、`isPublished`、`isExcluded`
- `ConfigValidationError`

### コンテンツ

- `ContentManager` — 解釈、マニフェスト、グラフ、Plugin の実行、公開 URL の解決
- `ContentSource`、`readContentSourceEntry`、`getContentSourceEntry`
- `queryContentEntries` と `ContentQuery*` のフィルタ・ソート型
- `createContentGraph`、`readOnlyContentGraph`
- `resolveDefaultContentLocation`、`attachmentUrl`、コンテンツパスと拡張子のヘルパー
- `readContentBuildStateStatus`、`resolveContentBuildStatePath`

### パイプライン

- `Pipeline`、`PipelineOptions`

### Client

- `@riebeckite/core/client` はグラフレイアウトのヘルパーを公開します
- `@riebeckite/node` は `FileSystemContentSource` を公開します

### Plugin

- `definePlugin`、`resolvePlugins`、`getResolvedPluginMetadata`、`PluginDependencyError`
- `defineEndpoint`、`createClientEntry`、`createStyleAsset`
- `Plugin*` のコンテキスト、アセット、エンドポイント、診断、SEO、パイプラインの型

### Theme と設定

- `defineTheme` と `Theme*` の型
- `RiebeckiteConfig`、`ResolvedRiebeckiteConfig`、`SiteConfig`、`PostContent`、`PostFrontmatter`、`PublishStrategy`

### ユーティリティと可観測性

- `uniqueStrings`、`escapeHtml`、`escapeHtmlAttribute`、`normalizeTag`、`calculateReadingTime`、`stripHtml`
- `ConsoleLogger`、`NoopLogger`、`NoopTracer`、`SinkTracer`、`CompositeTraceSink`

## 関連資料

- [Framework Reference](../../docs/docs/reference/README.ja.md)
- [Content System](../../docs/docs/framework/content-system.ja.md)
- [Plugin System](../../docs/docs/reference/plugin-api.ja.md) / [Theme System](../../docs/docs/reference/theme-api.ja.md)
- [Architecture](../../docs/docs/framework/architecture.ja.md)
