---
date: 2026-10-14
title: ページ（Page）
sidebar:
  hidden: true
---

# ページ（Page）

サイトがURLで提供する、ルーティング可能なコンテンツです。ページはMarkdownから作られる場合と、プラグインのページ種別から作られる場合があり、インテグレーションがルートを通じて描画します。

## Markdownページとプラグインページ

ほとんどのページはMarkdownから作られます。[ページ種別](./page-type.md)を使うと、プラグインはインデックスや生成された一覧など、通常のMarkdownではないページを提供できます。

## 描画の詳細

インテグレーションは `getPagePaths` と `getPageRoutes`（`packages/core/src/plugin/plugin_runtime.ts`）を通じてページのルートを解決し、アプリケーションが最終的なHTMLを組み立てます。プラグインが提供するのはbody HTMLであり、サイトシェルではありません。

プラグインのページ種別では、`PluginPageType`（`packages/core/src/types/plugin_page.ts`）の `resolve` メソッドが `PluginPageContext` を受け取り、`pathname` と `body` を持つ `PluginPage` を返します。インテグレーションはこれをサイトのドキュメントフレームを通じて描画します。

プラグインでのページ種別の宣言例：

```ts
export default definePlugin({
  name: "my-plugin",
  pageTypes: [
    {
      id: "my-page-type",
      paths: ["my-page"],
      resolve: async (context) => ({
        type: "my-plugin",
        pathname: "/my-page",
        body: "<p>Hello from plugin</p>",
      }),
    },
  ],
});
```

アプリケーションでの描画例：

```tsx
<Page route={page.route} data={page.data} body={page.body} />
```
