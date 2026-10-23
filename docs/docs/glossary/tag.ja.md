---
date: 2026-10-14
title: タグ（Tag）
sidebar:
  hidden: true
---

# タグ（Tag）

タグは共通のラベルでコンテンツエントリをまとめ、`/tags/<slug>` に一覧ページを生成します。あわせてRSS/Atom/JSONフィードと、関連タグのナビゲーションを提供します。

## タグの仕組み

`taxonomy()` プラグインはマニフェストの公開エントリを読み、frontmatterの `tags` フィールドでグループ化します。

タグ値ごとに `/tags/<slug>` のタームページを生成します。

タグページには、エントリ一覧、RSS/Atom/JSONフィード、関連タグのナビゲーション（`relatedLimit` で件数を制限）が含まれます。

## タグページの構造

タグページは、`taxonomy-term` ページ種別を使う汎用のHonoXキャッチオールルートとして描画されます。

ページには、そのタグを共有するエントリの一覧が、解決済みの `permalink` を通じたリンクとして並びます。

タームごとのフィードは、ビルドの生成物シンクを通じて静的ファイルとして書き出されます。

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

`tags: false` でタグ生成を無効にできます。`related` オプションを有効にすると、共起に基づくナビゲーションを生成します。

## タグのURL構造
タグ値ごとに `/tags/<slug>` のタームページを生成します。タグのベースパスは `taxonomy()` の `tagsBasePath` オプションで設定できます。

```ts
taxonomy({
  tagsBasePath: "/custom-tags",
})
```

既定のベースパスは `/tags` です。タグページはエントリ一覧、RSS/Atom/JSONフィード、関連タグのナビゲーションを提供します。

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
