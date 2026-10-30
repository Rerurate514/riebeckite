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

インテグレーションはページ種別のresolver（`packages/core/src/plugin/plugin_runtime.ts`）でリクエストを解決し、`getPagePaths` と `getPageRoutes` は静的出力を列挙します。アプリケーションが最終的なHTMLを組み立てます。プラグインが提供するのはbody HTMLであり、サイトシェルではありません。

プラグインのページ種別では、`PluginPageType`（`packages/core/src/types/plugin_page.ts`）の `resolve` メソッドが `PluginPageContext` を受け取り、`pathname` と `body` を持つ `PluginPage` を返します。インテグレーションはこれをサイトのドキュメントフレームを通じて描画します。ルートメタデータだけでリクエストを解決できるページ種別は、`resolveRoute` も実装できます。開発時はこの明示的な opt-in を使い、Full Manifest を作らずに解決します。有効なページ種別に一つでも未実装のものがあれば、安全のため Full Manifest を使います。

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
      resolveRoute: async (context) => ({
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
