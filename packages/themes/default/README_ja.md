# @riebeckite/theme-default

Riebeckite の標準テーマです。色、文字組み、余白、記事レイアウトを CSS のデザイントークンとして定義します。テーマを指定しなければ、このテーマが使われます。

標準テーマは「基準になる」テーマです。装飾に頼らず、文字サイズと太さ、そして 1px の罫線で情報の階層を作ります。読みやすい本文幅、h2 の下に引く細い罫線、控えめな下線付きのリンク、左罫線だけの引用、チップ状のインラインコード、平坦なコードブロック、細い罫線のテーブルとプラグイン UI。配色・角丸・余白はニュートラルに保ち、どんなサイトにもなじむ土台として使えることを目指しています。

キャラクター層の CSS は `styles/theme.css` の末尾にレイヤー外で置き、テーマルートにスコープしています。`!important` は使いません。

[English](./README.md)

## 標準テーマを明示する

通常は `config.theme` を省略して構いません。設定を明示したい場合は `defaultTheme()` を使います。

```ts
import { defineConfig } from "@riebeckite/core";
import { defaultTheme } from "@riebeckite/theme-default";

export default defineConfig({
  // ...
  theme: defaultTheme({
    colorMode: "system",
    typography: "system",
    articleLayout: "article",
  }),
});
```

このテーマの名前は `riebeckite` です。`config.theme` を省略した場合も、同じテーマが選ばれます。

## 変更できる項目

| 項目 | 既定値 | 説明 |
| --- | --- | --- |
| `colorMode` | `"system"` | `"light"`、`"dark"`、`"system"`。`system` は `data-theme` がなければ OS の配色設定に従う |
| `typography` | `"system"` | `"system"`、`"serif"`、`"sans"`。`data-typography` で選択できる |
| `articleLayout` | `"article"` | `"article"`、`"sidebar"`、`"full-width"` のレイアウト値 |
| `tokens` | `{}` | 色、フォント、余白、レイアウト幅のトークンを上書きする |
| `userCss` | `[]` | 追加で読み込むスタイルシート |

`data-theme="dark"` または `data-theme="light"` をルート要素に付けると、配色モードを固定できます。

## CSS で使えるトークン

テーマは `--rb-*` 形式の CSS カスタムプロパティを定義し、`@theme` ブロックにも対応する値を渡します。そのため、通常の CSS と Tailwind 系ユーティリティのどちらからも同じトークンを利用できます。

- 色: `--rb-color-paper`、`--rb-color-ink`、`--rb-color-accent`、`--rb-color-border` など
- フォント: `--rb-font-body`、`--rb-font-heading`、`--rb-font-mono`
- 余白と幅: `--rb-space-1` から `--rb-space-8`、`--rb-layout-page-max`、`--rb-layout-article-max`、`--rb-layout-sidebar`

独自テーマでもこれらの意味的なトークン名を保つと、アプリケーションとプラグインのスタイルを差し替えやすくなります。

## 主なエクスポート

- `defaultTheme(options?)`: テーマを作成する
- `DefaultThemeOptions`: 設定用の型
- `@riebeckite/theme-default/style.css`: テーマのスタイルシート

## 関連資料

- [テーマシステム](../../../docs/ja/docs/reference/theme-api.md)

