---
date: 2026-10-14
title: コールアウト（Callout）
sidebar:
  hidden: true
---

# コールアウト（Callout）
ショートコードプラグインのコンテナ記法 `:::callout[Title]{type=warning}` または `:::note[Title]{type=info}` で作るコールアウトボックスです。出力は `div.rb-shortcode.rb-shortcode--callout` のラッパーと、その中の `div.rb-shortcode__note.rb-shortcode__note--{type}` です。

## コールアウトの記法
```md
:::callout[Warning]{type=warning}
More content.
:::
```

```md
:::callout[Note]{type=note}
This is a note callout.
:::
```
ラベル（または `title` 属性）は `rb-shortcode__note-title` になります。指定しない場合、タイトルは描画されません。

## コールアウトの種類
`type` は `rb-shortcode__note--{type}` クラスに使われる自由なトークンで、ショートコードプラグインは固定の一覧や種類ごとの既定タイトルを定義しません。よく使う値は `note`、`tip`、`warning`、`danger`、`bug`、`quote` です。

## タイトルとスタイルのカスタマイズ
ショートコードに任意のタイトルを渡せます：`:::callout[My Title]{type=warning}`。

Obsidian Markdown プラグインは、自前のコールアウトの既定タイトルを上書きできます。
```ts
plugins: [
  obsidianMarkdown({
    callout: {
      defaultTitles: {
        warning: "注意",
      },
    },
  }),
],
```

## Obsidian Markdownのコールアウトとの統合
`@riebeckite/plugin-obsidian-markdown` プラグインは、Obsidian 形式のコールアウトブロッククォート（`> [!NOTE]`、`> [!WARNING]` など）も解析し、同じ `rr-callout` の CSS クラスに変換します。これにより、ショートコードを使わずに Obsidian Markdown で書いたコールアウトも、Riebeckite で同じように描画されます。`+` または `-` を付けると `details` 要素で出力され、クライアント JavaScript なしで開閉できます。

## 関連用語
- [[glossary/obsidian-vault|Obsidian Vault]]
- [[tag|Tag]]
- [[shortcode|Shortcode]]
- [[sidenote|Sidenote]]
- [[backlink|Backlink]]
- [[glossary/site|Site]]
- [[glossary/ui|UI]]

## さらに詳しく
- [Obsidian Markdown](../plugins/obsidian-markdown.ja.md)
