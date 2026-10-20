---
title: Backlink
sidebar:
  hidden: true
---

# Backlink

どの公開ノートが現在のノートにリンクしているかを示すバックリンクの一覧です。`getPublishedBacklinks()`でcontent manifestから被リンクを解決し、公開されて一覧に載るノートだけに絞り込み、manifestの順序で並べます。

## 推奨する配置

`backlinksPlugin()`はデータソースを登録します。一覧を置きたい場所へ`<Backlinks />`を描画してください。通常は記事本文のあとに一度だけ置きます。`SiteProvider`と、publicな`entry`を持つ`Article`の内側では、コンポーネントが被リンクを自分で解決します。

被リンクがない場合（または公開された被リンクがない場合）、コンポーネントは何も描画しません。

## 高度なカスタマイズ

`backlinks`でデータを明示的に渡します。`getBacklinks({ view, slug })`で解決できます。

```tsx
import { Backlinks, getBacklinks } from "@riebeckite/plugin-backlinks";

const backlinks = await getBacklinks({ view, slug });

return (
  <aside>
    <Backlinks backlinks={backlinks} />
  </aside>
);
```

## 設定

```ts
plugins: [backlinksPlugin()];
```

Pluginを有効にしてコンポーネントを一度描画します。UIを外すには要素を取り除きます。

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
