---
title: Tag
sidebar:
  hidden: true
---

# Tag

Tagは共通のラベルでコンテンツをまとめ、`/tags/<slug>`に一覧ページを生成します。あわせてRSS・Atom・JSONのフィードと、関連タグのナビゲーションを提供します。

## タグの仕組み

`taxonomy()`Pluginはmanifestの公開entryを読み込み、frontmatterの`tags`fieldでまとめます。タグの値ごとに`/tags/<slug>`のページを生成します。

タグページには、そのタグを共有するentryの一覧、RSS・Atom・JSONのフィード、関連タグのナビゲーション（`relatedLimit`で件数を絞る）が含まれます。

## タグページの構造

タグページはHonoXのcatch-all routeで描画し、`taxonomy-term`というpage typeを使います。ページには、そのタグを共有するentryの一覧が`permalink`を通したリンクとして並びます。

タグごとのフィードは、Buildのgenerated outputとして静的ファイルに書き出されます。

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

`tags: false`でタグの生成を止められます。`related`optionを有効にすると、共起をもとにしたナビゲーションを生成します。

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
