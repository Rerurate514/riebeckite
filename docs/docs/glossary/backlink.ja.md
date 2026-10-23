---
date: 2026-10-14
title: バックリンク（Backlink）
sidebar:
  hidden: true
---

# バックリンク（Backlink）

公開済みのどのノートが現在のノートにリンクしているかを示す、バックリンクの一覧表示です。`getPublishedBacklinks()`がコンテンツマニフェストから被リンクを解決し、公開されて検出可能なノートだけに絞り込んで、マニフェストの順序で並べます。

## 推奨する配置

`backlinksPlugin()`がデータソースを登録します。一覧を置きたい場所に`<Backlinks />`を描画します。通常は記事本文のあとに1回だけ置きます。`SiteProvider`と、公開された`entry`を持つ`Article`の内側では、コンポーネントが被リンクを自分で解決します。

被リンクがない場合（または公開された被リンクが1つもない場合）、コンポーネントは何も描画しません。

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

プラグインを有効にし、コンポーネントを1回描画します。UIをなくすには要素を取り除きます。

## バックリンクデータの解決
`getPublishedBacklinks()`関数は、コンテンツマニフェストから被リンクを解決します。次のオプションを受け取ります。

- **manifest**：コンテンツシンクから得た`ContentManifest`
- **config**：解決済みの`ResolvedRiebeckiteConfig`
- **slug**：現在のノートのslug
- **resolveTitle**：エントリのタイトルを解決する関数`(slug: string, title: unknown) => string`

戻り値は`ArticleBacklink[]`で、各要素は`slug`、`permalink`、`title`を持ちます。リンクは公開されて検出可能なエントリだけに絞り込まれ、マニフェストの順序で並びます。

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
