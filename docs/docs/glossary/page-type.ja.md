---
date: 2026-10-14
title: Page Type
sidebar:
  hidden: true
---

# Page Type

Pluginが独自の公開パスと本文を添えて提供するページの種類で、通常のMarkdownではないページに使います。Integrationがrouteを解決し、Applicationが最終的なHTMLを組み立てます。

## page typeが提供するもの

- ページの公開パス。
- Integrationが描画できる本文。
- incremental build用のoutput dependency。

## page typeの境界

page typeはHonoXのrouteやサイトの枠組みを所有しません。ページを宣言し、配置するのはIntegrationとApplicationです。この境界により、plugin page typeはframework-independentであり、Integrationによって構成されます。

page typeライフサイクル：

1. **Declaration**: pluginが`id`、`paths`、`resolve`、およびオプションの`priority`、`directoryIndex`、`outputDependencies`を持ってpage typeを宣言
2. **Resolution**: Integrationが`pluginRuntime.resolvePage()`(`packages/core/src/plugin/plugin_runtime.ts`)を呼び出し、与えられたpathnameに一致するpage typeを見つける
3. **Rendering**: Applicationはplugin pageのbodyとメタデータを使用してdocument frameを通じて描画
4. **Output dependencies**: `outputDependencies`が指定されている場合、incremental buildサポートのために追跡される

output dependencies付きpage typeの例:

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
        body: `<p>Tagged posts: ${tag}</p>`,
      };
    },
  },
],
```

output dependenciesのtracking例:

`outputDependencies`はSSGビルド中に収集され、マニフェストに保存されます。dependencyが変更された場合（例：tag設定の変更）、次のビルドでaffected pagesが再生成されます。
