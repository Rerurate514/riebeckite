---
date: 2026-10-14
title: Integration
sidebar:
  hidden: true
---

# Integration

Coreのコンテンツとページを、HonoXやViteといった描画・配信のスタックにつなぐパッケージです。コンテンツの論理を持たずに、routeを描画し出力を書き出します。

## 責務

- routeを通してページとPluginのpage typeを描画します。
- 生成した出力を書き出します。
- サイトを配信先につなぎます。

## integrationの責務
integrationはRiebeckite Coreとホストフレームワーク（例：HonoX + Vite）の間のブリッジとして機能します。主要な責務は以下の通りです：

- **route解決**: `resolveRiebeckiteRoute`(`@riebeckite/honox`)を使用して、incoming request pathsをページにマッピングします。解決順序は：plugin pageチェック→ publicLocationによるcontent解決→ redirectチェック→ 404です。
- **出力生成**: ページHTMLを描画し、sitemap、robots、feedなどの生成ファイルを書き出します。
- **デプロイ接続**: ビルド出力をCloudflare Workersなどのホスティング先に接続します。integrationはコンテンツ解釈を所有しません：Coreのコンテンツ処理とmanifest解決は、integrationの選択とは独立しています。

```ts
import { resolveRiebeckiteRoute } from "@riebeckite/honox";
const result = resolveRiebeckiteRoute(content, requestPath);
```

integrationを差し替えても、Coreのコンテンツ処理とmanifest解決は変更されないため、コンテンツの解釈は変わりません。

## 境界

Coreがコンテンツ処理と公開位置の解決を担い、integrationが描画と配信を担います。そのためintegrationを差し替えても、コンテンツの解釈は変わりません。
