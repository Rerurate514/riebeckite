# @riebeckite/plugin-autocardlink

<!-- Generated from docs/docs/plugins/autocardlink.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

`cardlink` コードブロックを、外部ページへのプレビューカードに変換するプラグインです。

[English](./README.md)

## できること

`autoCardLinkPlugin()` は、タイトル、説明、ホスト名、favicon、任意の画像を含むリンクカードを生成します。スタイルはパッケージ内の `style.css` に含まれます。

```cardlink
url: https://example.com/post
title: "Example post"
description: "リンク先の短い説明"
host: example.com
favicon: https://example.com/favicon.ico
image: https://example.com/og.png
```

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
| `host` | 表示するホスト名。省略時は `url` のホスト名（解析できない場合は `url` そのもの） |
| `favicon` | favicon の URL |
| `image` | プレビュー画像の URL |

`title` と `description` は二重引用符で囲んでもよい（囲んだ場合は内部の `\"` をアンエスケープする）。`url`、`image`、`favicon` は `http(s)` または相対 URL のみ受け付ける。`javascript:` などの安全でないスキームは拒否し、`url` の場合はブロック全体を変換せず、`image`・`favicon` の場合はその要素を出力しない。

カードは別タブで開きます。画像と favicon は遅延読み込みされ、`data-lightbox-ignore="true"` が付くため、Lightbox の対象にはなりません。

カードは `div.rr-cardlink` コンテナとして出力され、カード本体のリンク（`a.rr-cardlink__card`）と、URL をクリップボードへコピーするボタン（`button.rr-cardlink__copy`）で構成されます。コピーボタンはデスクトップではホバー・フォーカス時のみ表示され、タッチデバイスでは常に表示されます。カードはコンテナクエリに対応しており、幅が狭い場合は説明文、続いてプレビュー画像が非表示になります。

## オプションと API

| オプション | 型 | 既定値 | 内容 |
| --- | --- | --- | --- |
| `className` | `string` | `(なし)` | カードのルート要素に追加する CSS クラス。`rr-cardlink` フックは常に付与する |

- `autoCardLinkPlugin(options?)` — プラグインファクトリ
- `remarkAutoCardLink(options?)` — Remark 変換だけを利用する場合の API
- `AutoCardLink`、`AutoCardLinkOptions` — 型

## 未対応の項目

カードは `cardlink` ブロックに書いたフィールドだけから生成します。リンク先ページを取得しないため、メタデータを自動で補うことはありません。

- `[[image.png]]` のようなローカル画像埋め込みは解決しない。`image` と `favicon` は URL のみ受け付ける。
- `favicon` や `image` の中の Wikilink は解決しない。
- Obsidian 版 Auto Card Link の `data-auto-card-link-depth` は実装していない。
- Open Graph メタデータの取得やキャッシュは行わない。`title`、`description`、`image` は明示的に書く必要がある。

## 関連資料

- [プラグインシステム](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.ja.md)
