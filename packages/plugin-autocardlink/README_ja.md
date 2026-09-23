# @riebeckite/plugin-autocardlink

`cardlink` code block を link preview card として描画します。

[English](./README_en.md)

## 概要

`autoCardLinkPlugin()` は `cardlink` fenced code block を anchor 形式の
link card（title・description・favicon・host・任意の image）に変換します。
スタイルは `style.css` に同梱されています。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { autoCardLinkPlugin } from "@riebeckite/plugin-autocardlink";

export default defineConfig({
  // ...
  plugins: [autoCardLinkPlugin()],
});
```

## 記法

````
```cardlink
url: https://example.com/post
title: "Example post"
description: "A short summary of the linked page."
host: example.com
favicon: https://example.com/favicon.ico
image: https://example.com/og.png
```
````

| フィールド | 説明 |
| ---------- | ---- |
| `url` | link 先。必須（`url` が無い block はそのまま） |
| `title` | card の title（quote 付きの値も可）。省略時は `url` |
| `description` | card の description（quote 付きの値も可） |
| `host` | host 表示。省略時は `url` |
| `favicon` | favicon の image URL |
| `image` | preview image。無い場合は no-image レイアウト |

描画された card は新規タブ（`target="_blank" rel="noopener
noreferrer"`）で開きます。preview image と favicon は lazy load され、
`data-lightbox-ignore="true"` が付くため
`@riebeckite/plugin-lightbox` の対象外になります。

## オプション

| オプション | 型 | デフォルト | 説明 |
| ---------- | -- | ---------- | ---- |
| `className` | `string` | `"rr-cardlink"` | card の root CSS class |

## エクスポート

- `autoCardLinkPlugin(options?)` — plugin factory
- `remarkAutoCardLink(options?)` — 単体で使える remark transform
- 型: `AutoCardLink`、`AutoCardLinkOptions`

## 関連

- [Plugin ガイド](../../docs/plugins_jp.md)
