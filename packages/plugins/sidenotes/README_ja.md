# @riebeckite/plugin-sidenotes

Riebeckite 用の Tufte スタイルのサイドノート・プラグインです。執筆者は通常の
GFM 脚注（`[^1]` と `[^1]: 本文`）をそのまま書き続けます。プラグインが生成
された脚注マークアップを、インラインの参照リンクと、デスクトップではマージン
ノート、モバイルではタップで開くポップオーバーとして表示されるノートに書き
換えます。

[English](./README.md)

## 仕組み

このプラグインは、`remark-gfm` の出力をコアのパイプラインが脚注マークアップ
に変換したものを、rehype プラグインで書き換えます。

- 脚注参照は `[data-rr-sidenotes-ref]` を持つ小さな参照リンク付きの `sup`
  になり、`href="#fn-…"` のリンク先は保持されます。通常のブラウザのリンク
  遷移でも脚注に到達できます。
- 脚注定義は参照のそばの `.rr-sidenotes__note` の aside になります。
  デスクトップ（`@media (min-width: 48rem)`）では常時表示の**マージンノート**、
  モバイル（`@media (max-width: 48rem)`）では**ポップオーバー**として表示
  されます。
- 文末の脚注定義セクションは残します（モバイルではリンク先、JavaScript が
  無効な場合のフォールバックになります）。マージンノートが常に見える
  デスクトップでは非表示にします。

クライアントエントリ（`initSidenotes`）がモバイルのポップオーバーを切り替え
ます。タップで開閉、`Escape` で閉じる、外側のクリックで閉じる、という動作です。
`(min-width: 48rem)` に一致するときは動作しません。デスクトップのマージン
ノートに JavaScript は不要です。

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
Riebeckite は本文の横にマージンノートを表示します。[^1]

[^1]: デスクトップでは参照の横に、モバイルではポップオーバーでノートが表示されます。
```

## オプション

| オプション | 型 | 既定値 | 説明 |
| ---------- | -- | ------ | ---- |
| `className` | `string` | `""` | 各サイドノートのルートに追加する CSS クラス |
| `ariaLabel` | `string` | `"Sidenote"` | 各ノートのアクセシブル名の接頭辞（`"Sidenote 1"` の形） |
| `openLabel` | `string` | `"Footnote"` | 閉じた参照リンクのアクセシブル名の接頭辞（`"Footnote 1"`） |
| `closeLabel` | `string` | `"Close sidenote"` | 開いた参照リンクのアクセシブル名の接頭辞（`"Close sidenote 1"`） |
| `popoverAlignment` | `"bottom" \| "end"` | `"bottom"` | モバイルのポップオーバーの表示位置 |

```ts
sidenotes({
  ariaLabel: "注記",
  popoverAlignment: "end",
});
```

## 出力

```html
<p>
  Riebeckite は本文の横にマージンノートを表示します。<sup class="rr-sidenotes__ref">
  <a href="#user-content-fn-1" id="user-content-fnref-1" class="rr-sidenotes__toggle"
     data-rr-sidenotes-ref aria-expanded="false" aria-controls="rr-sidenotes-1"
     aria-label="Footnote 1">1</a></sup>
</p>
<aside class="rr-sidenotes__note rr-sidenotes__note--popover-bottom" id="rr-sidenotes-1"
       data-rr-sidenotes-note aria-label="Sidenote 1" tabindex="-1">
  <span class="rr-sidenotes__index" aria-hidden="true">1</span>
  <div class="rr-sidenotes__body"><p>デスクトップでは参照の横に表示されます。</p></div>
</aside>
```

## アクセシビリティ

- 参照リンクは実際のリンク（`href="#user-content-fn-…"`）で、`aria-expanded`
  と `aria-controls` を持ちます。クライアントは `aria-expanded` を切り替え、
  `openLabel` と `closeLabel` の間でラベルを差し替えます。
- ポップオーバーは `aria-label` でラベル付けされ、開いたときは
  `tabindex="-1"` によりフォーカスを受け取ります。
- JavaScript が無効でも、タップで通常の GFM と同じように脚注定義へジャンプ
  します。

## スタイル

パッケージに `style.css` が含まれます。他のプラグインと同じように読み込みます。

```ts
import "@riebeckite/plugin-sidenotes/style.css";
```

安定フックは `rr-sidenotes` 規約に従います。`rr-sidenotes__toggle`、
`rr-sidenotes__note`、`rr-sidenotes__index`、`rr-sidenotes__body`、
`rr-sidenotes__footnotes`、そして `rr-sidenotes__note--open` 修飾子です。

## エクスポート

- `sidenotes(options?)` — プラグインファクトリ
- `sidenotesPlugin` — `sidenotes` のエイリアス
- `rehypeSidenotes(options?)` — rehype トランスフォーマー
- `resolveSidenotesOptions(options?)` — オプションの既定値を適用する
- `renderSidenotesReference(input)` / `renderSidenotesNote(input)` — HTML 生成関数
- `initSidenotes(options?)` — クライアントのポップオーバー初期化関数
- 型: `SidenotesOptions`, `ResolvedSidenotesOptions`, `SidenotesClientOptions`

## 制約

- 同じ定義を再利用した脚注は、1 つのマージンノートとポップオーバーを共有
  します。
- デスクトップでは脚注定義セクションを非表示にします。ノートを置くための
  余白が必要です。テーマは `.rr-sidenotes__note` を自由に再スタイルできます。
- テーブル内や深く入れ子になったインライン要素の中の注は、最も近いブロック
  要素の後ろに置かれるため、縦位置はおおよその位置になります。

## ????

- [?????????](../../../docs/ja/plugin-system.md)
