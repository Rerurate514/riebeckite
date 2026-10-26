---
date: 2026-10-08
title: Sidenotes
---
# Sidenotes

Riebeckite 用の脚注スタイルプラグインです。執筆者は通常の GFM 脚注（`[^1]` と `[^1]: 本文`）をそのまま書き続けます。既定では脚注定義は記事末尾の脚注リストに残ります。`placement: "margin"` を指定すると、Tufte スタイルのマージンノートとして参照の横に表示します。

[English](./sidenotes.md)

## 仕組み

このプラグインは、コアのパイプラインが `remark-gfm` の出力を脚注マークアップに変換した後、rehype プラグインとしてそれを読み取ります。

既定の `placement: "end"` では:

- 文末の `<section data-footnotes>` に `.rr-sidenotes__footnotes` と
  `data-rr-sidenotes-placement="end"` が付きます。
- 各参照は `sup` に `rr-sidenotes__ref`、リンクに
  `rr-sidenotes__toggle` が付きます。元の `href`、`id`、バックリンクはその
  まま残るため、JavaScript なしで遷移できます。
- セクションは画面幅にかかわらず記事末尾に表示されます。

`placement: "margin"` では:

- 各定義は、最初の参照を含む最も近いブロックの後ろに
  `.rr-sidenotes__note` の aside として置かれます。記事の横に置ける幅
  （`@media (min-width: 88rem)`）までは本文フロー内に表示し、それ以上の幅では
  右マージンに sticky で表示します。
- 参照のリンク先はノート（`href="#rr-sidenotes-…"`）になります。
- 文末の脚注定義セクションは
  `data-rr-sidenotes-placement="margin"` で非表示になります。

クライアントエントリはありません。どちらの配置も JavaScript なしで動作します。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { sidenotes } from "@riebeckite/plugin-sidenotes";

export default defineConfig({
  // ...
  plugins: [sidenotes()],
});
```

通常の GFM 脚注を書くだけです。

```md
Riebeckite は脚注を記事末尾のリストに表示します。[^1]

[^1]: 記事の最後に注記が表示されます。
```

マージンノートにする場合:

```ts
plugins: [sidenotes({ placement: "margin" })];
```

## 実行例

ここに脚注への参照を置きます。[^live-example]

[^live-example]: この注釈は sidenotes プラグインが描画します。

## オプション

| オプション | 型 | 既定値 | 説明 |
| ---------- | -- | ------ | ---- |
| `placement` | `"end" \| "margin"` | `"end"` | `"end"` は文末の脚注リスト、`"margin"` は参照の横のマージンノート |
| `className` | `string` | `""` | 各マージンノートに追加する CSS クラス（`"end"` では無視） |
| `ariaLabel` | `string` | `"Sidenote"` | 各マージンノートのアクセシブル名の接頭辞（`"Sidenote 1"` の形） |
| `openLabel` | `string` | `"Footnote"` | 各参照リンクのアクセシブル名の接頭辞（`"Footnote 1"`） |

```ts
sidenotes({
  placement: "margin",
  ariaLabel: "注記",
});
```

## 出力

既定（`placement: "end"`）:

```html
<p>
  Riebeckite は脚注を記事末尾に表示します。<sup class="rr-sidenotes__ref">
  <a href="#user-content-fn-1" id="user-content-fnref-1" data-footnote-ref
     class="rr-sidenotes__toggle" aria-label="Footnote 1">1</a></sup>
</p>
<section data-footnotes class="footnotes rr-sidenotes__footnotes"
         data-rr-sidenotes-placement="end">
  <h2 class="sr-only" id="footnote-label">Footnotes</h2>
  <ol><li id="user-content-fn-1"><p>記事の最後に注記が表示されます。</p></li></ol>
</section>
```

`placement: "margin"`:

```html
<p>
  Riebeckite は参照の横に注記を表示します。<sup class="rr-sidenotes__ref">
  <a href="#rr-sidenotes-1" id="user-content-fnref-1" class="rr-sidenotes__toggle"
     data-rr-sidenotes-ref aria-label="Footnote 1">1</a></sup>
</p>
<aside class="rr-sidenotes__note" id="rr-sidenotes-1"
       data-rr-sidenotes-note aria-label="Sidenote 1" tabindex="-1">
  <span class="rr-sidenotes__index" aria-hidden="true">1</span>
  <div class="rr-sidenotes__body"><p>参照の横に表示される注記です。</p></div>
</aside>
```

## アクセシビリティ

- `placement: "end"` では、参照は GFM 標準の `href`、`id`、バックリンクを
  そのまま保ち、`openLabel` から作った `aria-label` だけを追加します。
- `placement: "margin"` では、参照はノートへリンクします。ノートは
  `aria-label` でラベル付けされ、`tabindex="-1"` でフォーカスを受け取れます。
- 脚注リストと参照には `scroll-margin-block-start` を指定し、sticky
  ヘッダーに隠れないようにしています。

## スタイル

パッケージに `style.css` が含まれます。他のプラグインと同じように読み込みます。

```ts
import "@riebeckite/plugin-sidenotes/style.css";
```

安定フックは `rr-sidenotes` 規約に従います。`rr-sidenotes__toggle`、
`rr-sidenotes__ref`、`rr-sidenotes__note`、`rr-sidenotes__index`、
`rr-sidenotes__body`、`rr-sidenotes__footnotes` です。

## エクスポート

- `sidenotes(options?)`：プラグインファクトリ
- `sidenotes`：`sidenotes` のエイリアス
- `rehypeSidenotes(options?)`：rehype トランスフォーマー
- `resolveSidenotesOptions(options?)`：オプションの既定値を適用する
- `renderSidenotesReference(input)` / `renderSidenotesNote(input)`：HTML 生成関数
- 型: `SidenotesOptions`, `ResolvedSidenotesOptions`

## 制約

- `placement: "margin"` では、同じ定義を再利用した脚注は 1 つのノートを共有
  します。
- マージン配置では、文末の脚注定義セクションは DOM に残りますが非表示に
  なります。テーマは `.rr-sidenotes__note` を自由に再スタイルできます。
- テーブル内や深く入れ子になったインライン要素の中の注記は、最も近いブロック要素の後ろに置かれるため、縦位置はおおよその位置になります。

## 関連リンク

- [[plugin-api|プラグイン API]]
