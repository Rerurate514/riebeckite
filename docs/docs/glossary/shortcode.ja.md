---
title: Shortcode
sidebar:
  hidden: true
---

# Shortcode

`remark-directive`の記法を使う汎用のショートコード機構です。インライン（`:name[label]{key=value}`）、ブロック（`::name[label]{key=value}`）、コンテナ（`:::name[label]{key=value}`… `:::`）のショートコードに対応し、組み込みのレジストリを持ちます。

## 記法の概要

```md
:badge[New]{variant=success}           // インラインショートコード
::kbd[Ctrl+S]                            // ブロックの leaf ショートコード
:::note[Tip]{type=info} … :::           // コンテナショートコード
```

- インラインのショートコードは、周囲の段落の中に`<span>`として描画されます。
- ブロックとコンテナのショートコードは、`rb-shortcode rb-shortcode--<name>`クラスを持つ`<div>`として描画されます。

インラインで使えるのは`inlineShortcodes`に列挙した名前だけです。組み込みでは`badge`、`kbd`、`link-card`、`file`が使えます。

## 組み込みショートコード

組み込みのショートコードは、よくある表現をまかないます。

| 名前 | 種類 | インライン | 属性 | 出力 |
|------|------|--------|------------|--------|
| `badge` | leaf | 可 | label, variant/type/color, title | インラインバッジ |
| `kbd` | leaf | 可 | labelまたは`keys` | `<kbd>`要素 |
| `note` / `callout` | leaf / container | – | labelまたは`title`、`type`/`variant` | Calloutボックス |
| `details` | container | – | labelまたは`summary` | `<details>`の開閉表示 |
| `youtube` | leaf | – | `id`または`url` | プライバシーに配慮した埋め込み |
| `figure` | leaf / container | – | `src`/`url`、`alt`、`caption` | 画像付きの`<figure>` |

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { shortcodes } from "@riebeckite/plugin-shortcodes";

export default defineConfig({
  plugins: [shortcodes()],
});
```

```md
:::callout[Warning]{type=warning}
設定ファイルを変更したあとは、サイトを Build し直してください。
:::
```

## カスタムショートコード
`shortcodes`オプションでカスタムショートコードを登録できます。

```ts
import { defineConfig } from "@riebeckite/core";
import { shortcodes } from "@riebeckite/plugin-shortcodes";

export default defineConfig({
  plugins: [shortcodes({
    shortcodes: {
      ad: ({ attributes, label }) => `<div class="rb-shortcode ad">${label || "Ad"}</div>`,
    },
  })],
});
```

組み込みのショートコードと同様に名前でマージされ、同じ名前の場合は上書きされます。

## 関連用語

- [[glossary/obsidian-vault|Obsidian Vault]]
- [[tag|Tag]]
- [[callout|Callout]]
- [[sidenote|Sidenote]]
- [[backlink|Backlink]]
- [[glossary/site|Site]]
- [[glossary/ui|UI]]

## さらに詳しく

- [Shortcodes](../plugins/shortcodes.ja.md)
