---
date: 2026-10-08
title: Marp
---
# Marp

Marp のスライドデッキをビルド時に描画するプラグインです。YAML frontmatter に `marp: true` を含むノートは文書全体をデッキとして描画し、`marp` コードブロックはインラインデッキとして描画します。

[English](./marp.md)

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { marp } from "@riebeckite/plugin-marp";

export default defineConfig({
  // ...
  plugins: [
    marp({
      theme: "default",
      allowHtml: true,
      math: true,
      caption: true,
    }),
  ],
});
```

## Obsidian Vault との互換性

Obsidian プラグインの [Marp](https://github.com/jichoup/obsidian-marp-plugin) と [Marp Slides](https://github.com/samuele-cozzi/obsidian-marp-slides) はノート全体を Marp デッキとして扱い、`marp` コードフェンスを保存しません。Obsidian ではプラグイン単位で有効になります。スライドプレビューを開いたり、エクスポートしたりすると、アクティブなノートのファイル全体をデッキとして描画し、ノート単位のマーカーは読みません。Riebeckite では代わりに、Marp CLI や VS Code 拡張と同じ標準的なフラグ（frontmatter の `marp: true`）を使い、文書単位でデッキとして描画します。これらのプラグインで書いたノートは次のように検出されます。

````markdown
---
marp: true
theme: gaia
paginate: true
---

# 1 枚目のスライド

---

# 2 枚目のスライド
````

文書全体（ディレクティブとして `theme` や `paginate` を効かせるため frontmatter を含む）を、ページ本文を置き換える 1 つの `<figure class="rb-marp">` デッキとして描画します。スライドの区切りは Marp と同じく `---` / `===` です。フラグも `marp` コードブロックもないノートは変更しません。

> **有効化の条件.** Riebeckite は Obsidian プラグインと同じ方法では有効になりません。Obsidian でスライドプレビューを開いてスライドとして表示していたノートも、frontmatter に `marp: true` がなければここではデッキとして描画されません。そのような Vault に必要な変更はこの 1 行の追加だけです。デッキの本体（セパレータ、`theme` / `paginate` などのディレクティブ、標準 Marp 構文）は保存された内容をそのまま使います。つまり、出力は Marp のセマンティクスに従いますが、設定なしでプラグイン単位に有効になる Obsidian 側の挙動は再現しません。完全なドロップイン互換ではなく「コンテンツ互換」として扱ってください。

## インラインデッキ

ノートでは、情報文字列に `marp` を付けたコードブロックを書きます。スライドの区切りは Marp と同じく `---` です。コードブロックの `title` を付けるとキャプションになります。

````markdown
```marp title="導入スライド"
# 1 枚目のスライド

- 箇条書き

---

# 2 枚目のスライド
```
````

## 描画の仕組み

`@marp-team/marp-core` をビルド時に動的 import して `Marp#render` を呼び出します。Marp Core はクライアントバンドルには含まれません。1 つのコードブロックは次の HTML に置き換わります。

```html
<figure class="rb-marp" role="group" data-marp data-marp-slides="2">
  <style>/* ビルド時に生成し、.rb-marp 配下へスコープした CSS */</style>
  <figcaption class="rb-marp__caption">…</figcaption>
  <div class="rb-marp__deck">
    <svg data-marpit-svg>…</svg>
    …
  </div>
  <details class="rb-marp__fallback">
    <summary>Marp source</summary>
    <pre><code>…元の Markdown…</code></pre>
  </details>
</figure>
```

### 生成される CSS のスコープとインライン化

プラグインは `<head>` へ注入できないため、Marp が生成した CSS は `<figure class="rb-marp">` の中へ `<style>` 要素としてインライン化します。ほかの要素に漏れないよう、次の処理を行います。

- Marp の `container` オプションでデッキのコンテナクラスを `rb-marp__deck` に固定し、生成 CSS の全セレクタがそのコンテナ配下に来るようにする
- コンテナセレクタを `.rb-marp` の子孫に限定する（例: `.rb-marp div.rb-marp__deck > svg > foreignObject > section`）
- グローバルに漏れる `@page` ルールを削除し、`@media print` 内の `html, body` を `.rb-marp` に置き換える

同じテーマのデッキが 1 ページに複数ある場合、生成される CSS が同一になるため `<style>` は 1 回だけ出力されます。

### ビルド時のレンダリング

- `script: false` でレンダリングするため、Marp Core 由来のクライアントスクリプトは含まれません。SVG スライドのサイズは `style.css` 側で調整します
- キャプションはコードブロックの `title` から取得します
- `data-marp-slides` にスライド枚数、`data-marp` にデッキであることを示す属性を付けます

### ビューア

小さなクライアントエントリ（`initMarpDecks`）が、2 枚以上のスライドを持つデッキを 1 枚ずつ表示するビューアに変えます。前後ボタン、スライド枚数、全画面ボタンを備え、デッキにフォーカスがある間は矢印キー、Page Up / Page Down、Home、End でも移動できます。JavaScript がない場合は全スライドが縦に積まれたまま表示されます。

### スライド単体ページ

公開された全文 Marp ノートには、パーマリンクの前に `/slides` を付けたデッキ専用ページも生成されます。`/notes/talk/` で公開されるノートは `/slides/notes/talk/` でも開けます。Marp ソースの折りたたみを除いて同じデッキを表示し、ノート本来のページは変わりません。インラインの `marp` フェンスには単体ページは生成されません。

## オプション

| 項目 | 既定値 | 説明 |
| --- | --- | --- |
| `theme` | `"default"` | Marp Core に登録済みのテーマ名（`"default"`、`"gaia"`、`"uncover"` など） |
| `allowHtml` | `true` | Marp Markdown 内の生 HTML を許可する |
| `math` | `true` | Marp の数式サポートを有効にする |
| `inlineSVG` | 未指定 | Marp の `inlineSVG` オプション。未指定なら SVG スライドを出力する |
| `caption` | `true` | コードブロックの `title` をキャプションとして表示する |
| `className` | `"rb-marp"` | ラッパー要素のクラス名 |

存在しないテーマを指定した場合は既定テーマへフォールバックし、`@riebeckite/plugin-marp` を `source` とする診断を出します。描画自体に失敗した場合は元のコードブロックを残し、同じく診断を出します。

## 制約

- クライアント側でのスライド編集は提供しません。ページ送りは組み込みビューアのみで、JavaScript が必要です。JavaScript がない場合は全スライドが縦に積まれて表示されます
- 利用できるテーマは Marp Core に登録済みのものに限られます。任意のテーマ CSS の読み込みには対応していません
- `inlineSVG: false` を指定すると SVG ラッパーなしの `<section>` を出力します。生成される CSS もその構造に合わせて変わります
- 文書全体のデッキは通常の Markdown パイプラインを通らないため、スライド内の Obsidian の `![[image]]` 埋め込みは解決されません。公開サイトに存在するパスを指定した通常の Markdown 画像記法を使ってください（Marp Slides 自体もウィキリンクには対応していません）

## 主なエクスポート

- `marp(options?)` / `marp(options?)`: プラグインを作成する
- `isMarpDocument(matter?)`: frontmatter の `marp: true` を判定するヘルパー
- `initMarpDecks()`: ビューアの初期化関数。`@riebeckite/plugin-marp/client` から公開
- 型: `MarpOptions`、`MarpDeck`、`MarpBuildRenderResult`

## 関連資料

- [[plugin-api|プラグインシステム]]
