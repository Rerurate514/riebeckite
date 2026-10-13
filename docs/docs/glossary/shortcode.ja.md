---
title: Shortcode
sidebar:
  hidden: true
---

# Shortcode

 `remark-directive` 構文を使用する汎用ショートシステムです。インライン (`:name[label]{key=value}`)、ブロック (`::name[label]{key=value}`)、コンテナー (`:::name[label]{key=value}` … `:::` ) に対応し、組み込みレジストリを備えています。

## 構文概要

```md
:badge[New]{variant=success}           // インラインショートコード
::kbd[Ctrl+S]                            // ブロックショートコード
:::note[Tip]{type=info} … :::           // コンテナショートコード
```

- インラインショートコード は周囲の段落内で `<span>` にレンダリングされます。
- ブロックとコンテナショートコード は `rb-shortcode rb-shortcode--<name>` クラスを持つ `<div>` にレンダリングされます。

 `inlineShortcodes` にリストされている名前のみインラインで使用できます。組み込みは `badge`, `kbd`, `link-card`, `file` が opt-in されています。


## 組み込みショートコード

組み込みショートコード は一般的なパターンをカバーします:

| 名前 | 種類 | インライン | 属性 | 出力 |
|------|------|--------|------|-----|
| `badge` | leaf | yes | label, variant/type/color, title | インラインバッジ |
| `kbd` | leaf | yes | label or `keys` | `<kbd>` 要素 |
| `note` / `callout` | leaf / container | – | label or `title`, `type`/`variant` | コールアウトボックス |
| `details` | container | – | label or `summary` | `<details>` ディスクロージャ |
| `youtube` | leaf | – | `id` or `url` | プライバシー対応の埋め込み |
| `figure` | leaf / container | – | `src`/`url`, `alt`, `caption` | 画像付き `<figure>` |


## 使用方法

```ts
import { defineConfig } from "@riebeckite/core";
import { shortcodes } from "@riebeckite/plugin-shortcodes";

export default defineConfig({
  plugins: [shortcodes()],
});
```

```md
:::callout[Warning]{type=warning}
サイト設定を変更した後にサイトを再構築することを覚えておいてください。
:::
```


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
