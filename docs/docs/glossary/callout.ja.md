---
title: Callout
sidebar:
  hidden: true
---

# Callout

コンテナ ショートコード構文 `:::callout[Title]{type=warning}` または `:::note[Title]{type=info}` を使用するコールアウトボックスです。CSS クラス `rr-callout rr-callout--{type}` でレンダリングされ、組み込みの既定のタイトルが使用されます。

## コールアウトの構文

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

出力: `div.rr-callout.rr-callout--note` に `data-callout`。
タイトルは組み込みのデフォルト (`note`, `tip`, `warning`, `danger`, `bug`, `quote`) にフォールバックします。


## コールアウトの種類

組み込みのコールアウト タイプと既定のタイトル:

- `note` / `note` → 既定タイトル "Note"
- `tip` → 既定タイトル "Tip"
- `warning` → 既定タイトル "Warning"
- `danger` → 既定タイトル "Danger"
- `bug` → 既定タイトル "Bug"
- `quote` → 既定タイトル "Quote"


## タイトルとスタイルのカスタマイズ

短縮タイトルを指定します: `:::callout[My Title]{type=warning}`.

プラグイン登録時の `callout.defaultTitles` で既定のタイトルを上書きできます:

```ts
callout: {
  defaultTitles: {
    warning: "注意",
  },
}
```


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
