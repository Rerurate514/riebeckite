---
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

## 境界

Coreがコンテンツ処理と公開位置の解決を担い、integrationが描画と配信を担います。そのためintegrationを差し替えても、コンテンツの解釈は変わりません。
