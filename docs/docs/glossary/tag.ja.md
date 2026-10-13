---
title: Tag
sidebar:
  hidden: true
---

# Tag

タグ は共通ラベルでコンテンツエントリをグループ化し、 `/tags/<slug>` でリストページを生成します。RSS/Atom/JSON フィードと関連タグナビゲーションも付帯します。

## タグの仕組み

 `taxonomy()` プラグイン はマニフェストの公開エントリを読み込み、`tags` frontmatter フィールドでグループ化します。

 各ユニークなタグ値が `/tags/<slug>` に term ページを生成します。

 タグページ には: そのタグを共有するエントリのリスト、RSS/Atom/JSON フィード、関連タグナビゲーション (relatedLimit で絞り込まれたもの) が含まれます。


## タグページの構造

 タグページ は HonoX の catch-all ルートを使用してレンダリングされ、 `taxonomy-term` ページタイプを使用します。

 ページ にはそのタグを共有するエントリのリストが含まれ、 `permalink` を通じたリンクが提供されます。

 1 件の term フィード はビルドの generated-output シンク を通じて静的ファイルとして書き込まれます。


## 設定

```ts
taxonomy({
  tags: true,
  folders: true,
  related: true,
  relatedLimit: 8,
  feeds: { rss: true, atom: true, json: true },
  feedLimit: 50,
})
```

 `tags: false` でタグ生成を無効化できます。 `related` オプション は共起ベースのナビゲーションを有効にします。


## 関連用語

- [[glossary/obsidian-vault|Obsidian Vault]]
- [[shortcode|Shortcode]]
- [[callout|Callout]]
- [[sidenote|Sidenote]]
- [[backlink|Backlink]]
- [[glossary/site|Site]]
- [[glossary/ui|UI]]

## さらに詳しく

- [Taxonomy](../plugins/taxonomy.ja.md)
