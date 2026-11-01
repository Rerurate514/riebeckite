---
date: 2026-10-14
title: アセット（Asset）
sidebar:
  hidden: true
---

# アセット（Asset）
プラグインのアセットは、`assets` 配列で宣言するスタイルシートなどの静的リソースです。インテグレーションのスタイルシートパイプラインを通じてブラウザに届き、`apps/web` へ直接コピーされることはありません。

## アセットの宣言
```ts
assets: [{
  pluginName: "example",
  kind: "style",
  moduleSpecifier: "@riebeckite/plugin-example/style.css",
}]
```

## パイプライン
プラグインの CSS は収集され、インテグレーションを通じてブラウザに届きます。ブラウザから `/node_modules` を直接参照しないでください。インテグレーションがモジュール指定子を解決し、ブラウザへ届けます。

## アセットの種類
`PluginAssetKind` は `"style"` または `"script"` です。スタイルアセットは CSS ファイル、スクリプトアセットは JavaScript ファイルです。どちらも `assets` 配列で宣言し、インテグレーションのパイプラインを通じてブラウザに届きます。

## 関連用語
- [[plugin|Plugin]]
- [[client-entry|Client entry]]
- [[glossary/theme|Theme]]
- [[design-token|Design Token]]

## さらに詳しく
- [Plugin API](../reference/plugin-api.ja.md)
- [Plugin Pipeline](../framework/plugin-system/pipeline.ja.md)
