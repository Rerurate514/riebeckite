---
date: 2026-10-08
title: レイアウト
sidebar:
  label: レイアウト
  order: 10
---
# レイアウト

## どこを変更すればいい？

まずは、変更したいものに対応する場所を確認してください。

| 変更したいもの | 主な場所 |
| --- | --- |
| ページやURL | `app/routes/` |
| 404（ページが見つからない） | `app/routes/_404.tsx` |
| ヘッダー / フッター | `app/components/`、`app/routes/_renderer.tsx` |
| 記事ページの構成 | `app/components/article.tsx` |
| ボタンなどのUI | `app/components/` |
| 操作できるUI | `app/islands/` |
| 色・余白・文字・レイアウト | `app/style.css`や各CSS |
| ヘッダー / フッターのリンク | `riebeckite.config.ts`の`navigation`プラグイン |

基本的には、**`app/`以下を編集すればサイトの見た目や構成を変更できる**と考えてかまいません。

ただし、`app/.riebeckite/`はRiebeckiteが自動生成するディレクトリです。ビルドのたびに更新されるため、直接編集しないでください。

## コンポーネントを作る

`app/components/`には、通常のHono JSXコンポーネントを作成できます。

```tsx
// app/components/callout.tsx
export function Callout({ children }: { children?: unknown }) {
  return <aside class="callout">{children}</aside>;
}
```

作成したコンポーネントは、ルートや別のコンポーネントから通常どおりimportして利用できます。

### RiebeckiteのUIプリミティブ

記事ページを作るときは、`@riebeckite/honox/ui`が提供する次のようなUIプリミティブも利用できます。

- `Article`
- `ArticleLayout`
- `ArticleContent`

これらはRiebeckiteの記事構造を組み立てるための小さな部品です。専用のコンポーネントフレームワークではないため、必ず使う必要はありません。サイト側で独自のHTML構造を作ることもできます。

詳しくは[UIプリミティブ](../../framework/honox-integration/ui.ja.md#uiプリミティブ)を参照してください。

## 記事ページのレイアウトを変える

スターターでは、記事ページの主な構成を次の2か所で管理しています。

```text
app/components/article.tsx
app/routes/_renderer.tsx
```

### `app/components/article.tsx`

ここにある`SiteArticle`が、記事ページのレイアウトを決めます。たとえば、次のような変更は主にここで行います。

- 記事タイトルの位置を変える
- 記事の前後にUIを追加する
- パンくずリストの位置を変える
- [[glossary/backlink|バックリンク]]や関連記事の位置を変える
- サイドバーを追加する

`SiteArticle`は`@riebeckite/honox/ui`の`Article`を利用して作られていますが、サイト側のコンポーネントなので自由に編集できます。

ルート内で`Article`という名前で使われているものは、このサイト側のコンポーネントを指します。`@riebeckite/honox/ui`の`Article`とは別物です。

### `app/routes/_renderer.tsx`

`_renderer.tsx`は、サイト全体を包む外側のレイアウトです。主に次のものを管理します。

- `<head>`
- ヘッダー
- フッター
- ナビゲーション
- ページ全体の共通UI
- Riebeckiteやプラグインが生成した[[glossary/head-tag|headタグ]]とスタイル
- **`RiebeckiteHead`による標準のhead内容の描画**

サイト全体に共通する部分を変えたい場合は、こちらを編集します。

標準のhead内容をフレームワークに任せつつ、独自のheadを追加する例です。

```tsx
import { RiebeckiteHead, ThemeRoot } from "@riebeckite/honox/ui";

export default jsxRenderer(({ children }, c) => (
  <ThemeRoot
    theme={config.theme}
    lang={c.get("htmlLanguage") ?? config.site.locale}
  >
    <head>
      <RiebeckiteHead
        title={config.site.title}
        headTags={c.get("headTags") ?? []}
      />
      <meta name="custom-site-value" content="..." />
    </head>
    <body class="riebeckite-page rb-site">{children}</body>
  </ThemeRoot>
));
```

詳しくは[headタグ](../../framework/honox-integration/site.ja.md#headタグ)を参照してください。
