---
date: 2026-10-14
title: ページ種別（Page Type）
sidebar:
  hidden: true
---

# ページ種別（Page Type）

プラグインが独自の公開パスと本文を添えて提供するページの種類で、通常のMarkdownではないページに使います。インテグレーションがルートを解決し、アプリケーションが最終的なHTMLを組み立てます。

## ページ種別が提供するもの

- ページの公開パス。
- インテグレーションが描画できる本文。
- [増分ビルド](./incremental-build.md)用の出力依存関係。

## ページ種別の境界

ページ種別はHonoXのルートやサイトシェルを所有しません。ページを宣言し、配置するのはインテグレーションとアプリケーションです。この境界により、プラグインのページ種別はフレームワークに依存せず、インテグレーションが組み合わせられます。

ページ種別のライフサイクル：

1. **宣言**：プラグインが `id`、`paths`、`resolve`、および任意の `priority`、`directoryIndex`、`outputDependencies` を指定してページ種別を宣言する
2. **解決**：インテグレーションが `pluginRuntime.resolvePage()`（`packages/core/src/plugin/plugin_runtime.ts`）を呼び、指定されたpathnameに一致するページ種別を探す
3. **描画**：アプリケーションが `PluginPage` のbodyとメタデータを使い、ドキュメントフレームを通じてプラグインページを描画する
4. **出力依存関係**：`outputDependencies` が指定されていれば、増分ビルドのために追跡される

出力依存関係付きのページ種別の例：

```ts
pageTypes: [
  {
    id: "tag-archive",
    paths: ["tag/*"],
    outputDependencies: ["dependencies:tag:archive"],
    resolve: async (context) => {
      const tag = context.slug.split("/")[1];
      return {
        type: "tag-archive",
        pathname: `/tags/${tag}/`,
        body: `<p>Posts tagged: ${tag}</p>`,
      };
    },
  },
],
```

出力依存関係の追跡例：

`outputDependencies` はSSGビルド中に収集され、マニフェストに保存されます。依存関係が変わると（例：タグ設定の変更）、次のビルドで影響を受けるページが再生成されます。
