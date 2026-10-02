# @riebeckite/theme-minimal

内容が主役で、装飾をほとんど持たないタイポグラフィ主体のテーマです。「文字と余白だけ」を方針に、モノクロの紙とインクで構成します。使うのはシステムフォントだけ、同梱フォントも JavaScript もありません。

[English](./README.md)

## 何をするテーマか

`minimalTheme()` は名前が `minimal` のテーマを作ります。完全な `--rb-*` トークンを `@theme` に対応させたうえで、安定した構造フック（`.rb-article-*`、`.rb-sidebar`、`.prose`）とプラグインのルート（`rr-*`）にタイポグラフィの個性を重ねます。指定はすべて `[data-theme-name="minimal"]` にスコープし、`@layer base` の外に置いています。

[Minimal for Obsidian](https://github.com/kepano/obsidian-minimal) の設計思想（内容が主役、静かな操作画面、強いタイポグラフィ、控えめなアクセント、詰まっていても読みやすいクローム）を、Riebeckite のセマンティックトークンと安定フックに置き換えて実装したものです。Obsidian デスクトップアプリの見た目を模したり、Obsidian の変数や DOM があることを前提にしたりはしません。

個性は引き算にあります。

- **狭い行長。** 記事カラムを `43rem` に絞り、ページのクロームを増やさずに一行の長さを読みやすく保ちます。
- **文字が主役。** 見出しは大きさ、太さ、字間で差をつけ、色・罫線・囲みは使いません。本文は行間を広めに取り、段落の余白もゆったりさせます。
- **塗りより罫線。** 引用、コード、表、記事メタ／フッター、プラグインのルートは、カードや塗り、影ではなく 1px の罫線とごく薄い背景（または背景なし）で扱います。角は直角のままです。
- **ほぼ無彩色。** アクセントはインクそのものだけ。リンクはインク色で、控えめな下線をホバーで少し強めます。アクセントを使うのはリンク、フォーカス／選択状態、操作部品に限ります。

設定を変えずに `defaultTheme()` を置き換えられ、ルートに `data-theme-name="minimal"` を報告します。

## インストール

```sh
pnpm add @riebeckite/theme-minimal
```

`@riebeckite/core` に依存し、配布物は CSS のみです。実行時のコードや同梱フォントは含みません。

## 設定する

```ts
import { defineConfig } from "@riebeckite/core";
import { minimalTheme } from "@riebeckite/theme-minimal";

export default defineConfig({
  // ...
  theme: minimalTheme({
    colorMode: "system",
    typography: "system",
    articleLayout: "article",
    userCss: [],
  }),
});
```

`defaultTheme()` と同じ `ThemeConfig` API なので、設定を変えずにほかのテーマと入れ替えられます。ルートの `data-theme-name` は `minimal` になります。

## 変更できる項目

| 項目 | 既定値 | 説明 |
| --- | --- | --- |
| `colorMode` | `"system"` | `"light"`、`"dark"`、`"system"` |
| `typography` | `"system"` | `"system"`、`"serif"`、`"sans"` |
| `articleLayout` | `"article"` | 記事レイアウトの値 |
| `tokens` | `{}` | 色、フォント、余白、レイアウト幅のトークンを上書きする |
| `userCss` | `[]` | 追加のスタイルシート |

トークンの意味と一覧は [`@riebeckite/theme-default`](../default/README_ja.md) を参照してください。色、フォント、余白、レイアウト幅、罫線幅のトークンはどのテーマでも共通です。角丸だけは各テーマの CSS に直接書いていて、トークンにはしていません。

## ライトとダーク

パレットはわざと色味を持たせず、無彩でまとめています。

- **ライト** — ほぼ白の読書面（`#ffffff`）、わずかに差をつけた副次サーフェス（`#f7f7f7` / `#ececec`）、濃いニュートラルのインク（`#1a1a1a`）、やわらかい副次テキスト（`#6b6b6b`）、低コントラストの罫線、そしてアクセントとしてのインク。
- **ダーク** — ニュートラルな暗い背景（`#1a1a1a`）と、わずかに持ち上げた副次サーフェス（`#242424` / `#2e2e2e`）、やわらかいオフホワイトの本文（`#e5e5e5`）、抑制した補助テキスト（`#9e9e9e`）、控えめな区切り、同じインク基調のアクセント。純黒や発光、彩度の高いアクセントは使いません。

`colorMode: "system"` では `data-theme` を付けず OS の設定に従います。`"light"` または `"dark"` を指定すると対応する `data-theme` が付きます。リンク、フォーカスリング、選択中の操作部品、選択範囲はいずれも同じインクのアクセントを使うため、どちらのモードでもはっきり見え、AA コントラストを満たします。

## 背景コントラストのバリエーション

本家 Minimal には背景コントラストのバリエーション（既定、低コントラスト、高コントラスト、トゥルーブラック）があります。現在の Riebeckite の Theme API にはバリエーションの概念がないため、このテーマは通常の見た目を既定として提供し、サーフェスの階層をセマンティックトークン（`--rb-color-paper`、`--rb-color-surface`、`--rb-color-surface-hover`、`--rb-color-code-background`）で表現しています。`tokens` オプションでサイトごとに上書きすることはすでに可能です。背景コントラストのバリエーションは、独自属性で見せかけるのではなく、将来 Theme API に追加できる拡張候補です。

## 主なエクスポート

- `minimalTheme(options?)`: テーマを作成する
- `MinimalThemeOptions`: 設定用の型
- `@riebeckite/theme-minimal/style.css`: テーマのスタイルシート

## 出典

Riebeckite theme based on the design principles of Minimal for Obsidian by Steph Ango (kepano).

- 原典: <https://github.com/kepano/obsidian-minimal>
- 原典のライセンス: MIT

配布条件はパッケージの `LICENSE` ファイルに記載しています。

## 関連資料

- [テーマシステム](../../../docs/ja/docs/reference/theme-api.md)
- [`@riebeckite/theme-default`](../default/README_ja.md)
- [`@riebeckite/theme-sakura`](../sakura/README_ja.md)
- [`@riebeckite/theme-tokyonight`](../tokyonight/README_ja.md)
- [`@riebeckite/theme-gruvbox`](../gruvbox/README_ja.md)
- [`@riebeckite/theme-rerurate`](../rerurate/README_ja.md)

