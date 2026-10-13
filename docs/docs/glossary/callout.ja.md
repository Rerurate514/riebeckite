---
title: Callout
sidebar:
  hidden: true
---

# Callout

コンテナショートコードの`:::callout[Title]{type=warning}`または`:::note[Title]{type=info}`で作るコールアウトボックスです。`rr-callout rr-callout--{type}`クラスを持つ`div`として描画され、組み込みの既定タイトルを持ちます。

## Calloutの記法

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

出力は`div.rr-callout.rr-callout--note`で、`data-callout`を持ちます。
タイトルは組み込みの既定値（`note`、`tip`、`warning`、`danger`、`bug`、`quote`）にフォールバックします。

## Calloutの種類

組み込みのCalloutの種類と既定タイトルです。

- `note` / `note` → 既定タイトル "Note"
- `tip` → 既定タイトル "Tip"
- `warning` → 既定タイトル "Warning"
- `danger` → 既定タイトル "Danger"
- `bug` → 既定タイトル "Bug"
- `quote` → 既定タイトル "Quote"

## タイトルとスタイルのカスタマイズ

ショートコードに任意のタイトルを渡せます。`:::callout[My Title]{type=warning}`と書きます。

Pluginの登録時に`callout.defaultTitles`オプションで既定タイトルを上書きできます。

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
