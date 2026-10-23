---
date: 2026-10-14
title: コールアウト（Callout）
sidebar:
  hidden: true
---

# コールアウト（Callout）
コンテナショートコードの`:::callout[Title]{type=warning}`または`:::note[Title]{type=info}`で作るコールアウトボックスです。`rr-callout rr-callout--{type}`のCSSクラスを持つ`div`として描画され、組み込みの既定タイトルを持ちます。

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
出力は`data-callout`を持つ`div.rr-callout.rr-callout--note`です。
タイトルを省略した場合は、組み込みの既定値（`note`、`tip`、`warning`、`danger`、`bug`、`quote`）が使われます。

## コールアウトの種類
組み込みのコールアウトの種類と既定タイトルです。

- `note` → 既定タイトル "Note"
- `tip` → 既定タイトル "Tip"
- `warning` → 既定タイトル "Warning"
- `danger` → 既定タイトル "Danger"
- `bug` → 既定タイトル "Bug"
- `quote` → 既定タイトル "Quote"

## タイトルとスタイルのカスタマイズ
ショートコードに任意のタイトルを渡せます：`:::callout[My Title]{type=warning}`。

プラグインの登録時に`callout.defaultTitles`オプションで既定タイトルを上書きできます。
```ts
callout: {
  defaultTitles: {
    warning: "注意",
  },
}
```

## Obsidian Markdownのコールアウトとの統合
`@riebeckite/plugin-obsidian-markdown`プラグインは、Obsidian形式のコールアウトブロッククォート（`> [!NOTE]`、`> [!WARNING]`など）も解析し、同じ`rr-callout`のCSSクラスに変換します。これにより、ショートコードを使わずにObsidian Markdownで書いたコールアウトも、Riebeckiteで同じように描画されます。

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
