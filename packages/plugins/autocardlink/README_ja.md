# @riebeckite/plugin-autocardlink

`cardlink` コードブロックを、外部ページへのプレビューカードに変換するプラグインです。

[English](./README.md)

## できること

`autoCardLinkPlugin()` は、タイトル、説明、ホスト名、favicon、任意の画像を含むリンクカードを生成します。スタイルはパッケージ内の `style.css` に含まれます。

## 設定

```ts
import { defineConfig } from "@riebeckite/core";
import { autoCardLinkPlugin } from "@riebeckite/plugin-autocardlink";

export default defineConfig({
  // ...
  plugins: [autoCardLinkPlugin()],
});
```

## `cardlink` ブロックの書き方

````md
```cardlink
url: https://example.com/post
title: "Example post"
description: "リンク先の短い説明"
host: example.com
favicon: https://example.com/favicon.ico
image: https://example.com/og.png
```
````

| フィールド | 内容 |
| --- | --- |
| `url` | リンク先。必須で、省略したブロックは変換しない |
| `title` | カードの見出し。省略時は `url` |
| `description` | 補足説明 |
| `host` | 表示するホスト名。省略時は `url` |
| `favicon` | favicon の URL |
| `image` | プレビュー画像の URL |

`title` と `description` は二重引用符で囲んでもよい（囲んだ場合は内部の `\"` をアンエスケープする）。`url`、`image`、`favicon` は `http(s)` または相対 URL のみ受け付ける。`javascript:` などの安全でないスキームは拒否し、`url` の場合はブロック全体を変換せず、`image`・`favicon` の場合はその要素を出力しない。

カードは別タブで開きます。画像と favicon は遅延読み込みされ、`data-lightbox-ignore="true"` が付くため、Lightbox の対象にはなりません。

## オプションと API

| オプション | 型 | 既定値 | 内容 |
| --- | --- | --- | --- |
| `className` | `string` | `(なし)` | カードのルート要素に追加する CSS クラス。`rr-cardlink` フックは常に付与する |

- `autoCardLinkPlugin(options?)` — プラグインファクトリ
- `remarkAutoCardLink(options?)` — Remark 変換だけを利用する場合の API
- `AutoCardLink`、`AutoCardLinkOptions` — 型

## 関連資料

- [プラグインシステム](../../../docs/ja/docs/reference/plugin-api.md)

