---
date: 2026-10-14
title: ショートコード（Shortcode）
sidebar:
  hidden: true
---

# ショートコード（Shortcode）

`remark-directive` の記法を使う汎用のショートコード機構です。インライン（`:name[label]{key=value}`）、ブロック（`::name[label]{key=value}`）、コンテナ（`:::name[label]{key=value}` … `:::`）のショートコードに対応し、組み込みのレジストリを持ちます。

## 記法の概要

```md
:badge[New]{variant=success}           // inline shortcode
::kbd[Ctrl+S]                            // block leaf shortcode
:::note[Tip]{type=info} … :::           // container shortcode
```

- インラインのショートコードは、周囲の段落の中に `<span>` として描画されます。
- ブロックとコンテナのショートコードは、`rb-shortcode rb-shortcode--<name>` クラスを持つ `<div>` として描画されます。

インラインで使えるのは `inlineShortcodes` に列挙した名前だけです。組み込みでは `badge`、`kbd`、`link-card`、`file` が使えます。

## 組み込みショートコード

組み込みのショートコードは、よくある表現をまかないます。

| 名前 | 種類 | インライン | 属性 | 出力 |
|------|------|--------|------------|--------|
| `badge` | leaf | 可 | label, variant/type/color, title | インラインバッジ |
| `kbd` | leaf | 可 | labelまたは`keys` | `<kbd>`要素 |
| `note` / `callout` | leaf / container | – | labelまたは`title`、`type`/`variant` | コールアウトボックス |
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
Remember to rebuild your site after changing the configuration file.
:::
```

## カスタムショートコード
カスタムショートコードは、プラグインに `shortcodes` オプションを渡して登録します。

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

カスタムショートコードは名前で組み込みの上にマージされ、組み込みと名前が衝突する場合は組み込みのレンダラーを上書きします。

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
