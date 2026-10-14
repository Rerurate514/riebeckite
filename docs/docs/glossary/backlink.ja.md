---
title: Backlink
sidebar:
  hidden: true
---

# Backlink

どの公開ノートが現在のノートにリンクしているかを示すバックリンクの一覧です。`getPublishedBacklinks()`でcontent manifestから被リンクを解決し、公開されて一覧に載るノートだけに絞り込み、manifestの順序で並べます。

## 推奨する配置

`backlinksPlugin()`は、被リンクの一覧を`article.footer`のbody slotに自動で追加します。

物理的な配置はSiteが持ちます。一覧はそのslotを描画する場所にだけ表示され、通常は記事本文のあとに一度だけ出ます。

被リンクがない場合（または公開された被リンクがない場合）、コンポーネントは何も描画しません。

## 高度なカスタマイズ

別の場所に置く場合は、`render: false`でslotへの自動追加を止めます。これはバックリンクのデータや公開の絞り込みを変えません。

データを自分で解決します。

```tsx
import Backlinks, { getPublishedBacklinks } from "@riebeckite/plugin-backlinks";
import { content } from "virtual:riebeckite/content";
import { getArticleTitle } from "../lib/article-title";

const manifest = await content.getManifest();
const backlinks = getPublishedBacklinks({
  manifest,
  config,
  slug,
  resolveTitle: getArticleTitle,
});

return (
  <aside>
    <Backlinks backlinks={backlinks} />
  </aside>
);
```

## 設定

```ts
plugins: [backlinksPlugin({ render: false })];
```

手動で置いたUIを外すには、コンポーネントを取り除きます。このコンポーネントと、自動描画を有効にした`article.footer`の両方を描画すると、二重に表示されます。

## バックリンクデータの解決
`getPublishedBacklinks()`関数はcontent manifestから被リンクを解決します。以下のオプションを受け入れます。

- **manifest**: content sinkからの`ContentManifest`
- **config**: 解決されたRiebeckite設定
- **slug**: 現在のノートのスラッグ
- **resolveTitle**: エントリタイトルを解決する関数`(slug: string, title: unknown) => string`

戻り値は`ArticleBacklink[]`で、各エントリには`slug`、`permalink`、`title`を含みます。リンクは公開されて検知可能なエントリのみにフィルタリングされ、manifestの順序で並べられます。

```ts
import { getPublishedBacklinks, content } from "@riebeckite/plugin-backlinks";
import { getArticleTitle } from "../lib/article-title";

const manifest = await content.getManifest();
const backlinks = getPublishedBacklinks({
  manifest,
  config,
  slug: "my-note",
  resolveTitle: getArticleTitle,
});
```

## 関連用語

- [[glossary/obsidian-vault|Obsidian Vault]]
- [[tag|Tag]]
- [[shortcode|Shortcode]]
- [[callout|Callout]]
- [[sidenote|Sidenote]]
- [[glossary/site|Site]]
- [[glossary/ui|UI]]

## さらに詳しく

- [Backlinks](../plugins/backlinks.ja.md)
