---
title: Page
sidebar:
  hidden: true
---

# Page

サイトがURLで提供する、ルーティング可能なコンテンツです。Markdownから作られる場合と、Pluginのpage typeから作られる場合があり、Integrationがrouteを通して描画します。

## MarkdownのページとPluginのページ

ほとんどのページはMarkdownから作られます。page typeを使うと、Pluginがindexや生成した一覧など、通常のMarkdownではないページを提供できます。

## 描画

Integrationがページのrouteを解決し、Applicationが最終的なHTMLを組み立てます。pluginはbody HTMLを提供し、サイトの枠組みではありません。

## 描画の詳細

Integrationは`getPagePaths`と`getPageRoutes`(`packages/core/src/plugin/plugin_runtime.ts`)を通じてページのrouteを解決し、Applicationが最終的なHTMLを組み立てます。pluginはbody HTMLを提供し、サイトの枠組みではありません。

Page Typeの場合は、`PluginPageType`（`packages/core/src/types/plugin_page.ts`）が`resolve`メソッドを提供し、`PluginPageContext`を受け取って`pathname`と`body`を持つ`PluginPage`を返します。Integrationはその後、サイトのdocument frameを通じて描画します。

Page Typeの宣言例（Plugin内）：

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
        body: "<p>PluginからのHello</p>",
      }),
    },
  ],
});
```

applicationでの描画例:

```tsx
<Page route={page.route} data={page.data} body={page.body} />
```
