---
date: 2026-10-14
title: ルート（Root）
sidebar:
  hidden: true
---

# ルート（Root）

Riebeckiteが他のパスを解決する基準となるディレクトリで、アプリケーションルートやコンテンツルートがあります。安定したルートを基準に解決することで、パスをマシン間で持ち運べます。

## アプリケーションルートとコンテンツルート
Riebeckiteは2つのルートディレクトリを定義します。

| ルート | 意味 |
| --- | --- |
| アプリケーションルート | サイトをビルドするディレクトリ。既定はVite/プロジェクトのルート |
| コンテンツルート | コンテンツを読み取るディレクトリ。設定の `content.directory` で指定 |

アプリケーションルートは、設定、環境変数、インテグレーション設定の相対パスを解決する基準として使われます。コンテンツルートは[コンテンツソース](./content-source.md)がMarkdownファイルを走査する対象です。設定の相対パスはアプリケーションルートを基準に解決されるため、同じ設定が別のマシンでも動きます。

## honoxインテグレーションでのルート解決
`@riebeckite/honox` インテグレーションは `resolveHonoxApplication` を通じてルートを解決し、`appRoot` と `configRoot` を決めます。既定では `appRoot` はViteのルート、`configRoot` は `appRoot` です。設定パスは `configRoot` を基準にインポートされ、`content.directory` は `appRoot` を基準に解決されます。

```ts
// Example: content.directory resolved relative to appRoot
content: {
  directory: "./content",
}
```

## パスの持ち運び
設定の相対パスはアプリケーションルートを基準に解決されるため、同じ設定が別のマシンでも動きます。コンテンツルートは[コンテンツソース](./content-source.md)が走査する対象です。
