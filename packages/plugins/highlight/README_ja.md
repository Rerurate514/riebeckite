# @riebeckite/plugin-highlight

`==ハイライト==` を `<mark>` 要素として表示するプラグインです。Markdown の
テキストノードをビルド時に書き換えます。

[English](./README.md)

## 概要

`highlight()` は、Markdown のテキストノードにある `==テキスト==` を HTML に
変換する前に生の HTML へ置き換える remark トランスフォーマーを登録します。
`~~打ち消し線~~` だけを扱う `remark-gfm` を補完します。

## 設定する

```ts
import { defineConfig } from "@riebeckite/core";
import { highlight } from "@riebeckite/plugin-highlight";

export default defineConfig({
  // ...
  plugins: [highlight()],
});
```

## 構文

```md
この文には ==ハイライトする語句== が含まれます。
```

出力:

```html
この文には <mark class="rb-highlight">ハイライトする語句</mark> が含まれます。
```

ハイライトは非貪欲に一致し、改行をまたぎません。空、または空白だけの
ハイライトは無視します。コードブロック、インラインコード、生の HTML、
frontmatter の内部は変更しません。

## オプション

| 項目 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `className` | `string` | `"rb-highlight"` | 生成する要素に付ける CSS クラス |
| `tag` | `string` | `"mark"` | ハイライトに使う HTML タグ |

```ts
highlight({ className: "my-highlight", tag: "span" });
```

## スタイル

このパッケージは `style.css` を同梱し、
`@riebeckite/plugin-highlight/style.css` として公開します。既定のルールは
`.rb-highlight` に控えめなアクセント背景を付け、テーマ変数
`--rb-color-accent` があればそれを使います。

```css
.rb-highlight {
  --rb-highlight-accent: var(--rb-color-accent, #f6d365);
  padding: 0.05em 0.25em;
  border-radius: 0.2em;
  background: color-mix(in srgb, var(--rb-highlight-accent) 45%, transparent);
  color: inherit;
}
```

プラグインはスタイルアセットを登録するため、ホスト側のサイトはこの
スタイルシートを自動的に取り込みます。見た目を変えたい場合はクラスを指定する
か、独自の CSS で上書きしてください。

## 制限

- ハイライトは複数のテキストノードや行をまたげません。`==` で他の Markdown
  (リンク、強調、コード) や改行を囲むことはできません。
- 入れ子のハイライトには対応しません。最も内側の `==` の組が優先されます。
- 生の HTML を出力するため、パイプラインで生 HTML の出力を有効にする必要が
  あります（Riebeckite の既定パイプラインでは有効です）。

## 主なエクスポート

- `highlight(options?)`: プラグインを作成する
- `highlightPlugin`: `highlight` の別名
- `remarkHighlight(options?)`: 内部の remark トランスフォーマー
- 型: `HighlightOptions`

## 関連資料

- [プラグインガイド](../../../docs/ja/docs/reference/plugin-api.md)

