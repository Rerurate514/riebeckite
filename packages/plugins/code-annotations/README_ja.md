# @riebeckite/plugin-code-annotations

VitePress / Docusaurus 風のコードブロック装飾を加えるプラグインです。フェンスの
メタ情報による行の強調と、`[!code ...]` のインラインマーカーによるフォーカス・
差分表示に対応します。素の `<pre><code>` と
`@riebeckite/plugin-code-enhance` の行ラッパーの両方で動作します。

[English](./README.md)

## 設定

```ts
import { defineConfig } from "@riebeckite/core";
import { codeAnnotations } from "@riebeckite/plugin-code-annotations";

export default defineConfig({
  // ...
  plugins: [codeAnnotations()],
});
```

プラグインは `style.css` のみを登録します。クライアントエントリーはなく、
実行時 JavaScript は追加しません。

## 書き方

### フェンスメタによる行の強調

言語の後ろに波括弧で行範囲を書きます。Docusaurus や VitePress と同じ記法です。

````md
```js {2,4-5}
const a = 1;
const b = 2;
const c = 3;
const d = 4;
const e = 5;
```
````

2、4、5 行目に `rb-code__line--highlighted` が付きます。

### フォーカス

`focus` メタ、またはインラインの `[!code focus]` を使います。行数を指定すると
その行から続く行までをまとめてフォーカスします。

````md
```js focus:{2}
const a = 1;
const b = 2;
```
````

````md
```js
const a = 1; // [!code focus]
const b = 2;
```
````

`rb-code__line--focused` が付きます。`[!code focus:3]` なら 3 行分です。

### 差分

````md
```js
const kept = true;
const added = true;    // [!code ++]
const removed = false; // [!code --]
```
````

マーカーのコメントは表示テキストから取り除かれ、行には
`rb-code__line--added` または `rb-code__line--removed` が付きます。

### 明示的な強調マーカー

````md
```js
const value = 1; // [!code highlight]
```
````

マーカーは `//`、`#`、`--`、`<!-- -->` のコメント記法に対応します。JavaScript、
シェル、SQL、Lua、HTML などで同じ書き方が使えます。

## オプション

| オプション | 既定値 | 内容 |
| --- | --- | --- |
| `className` | `"rb-code"` | ブロック直下（`<pre>` または `rehype-pretty-code` の `<figure>`）に付くクラス |
| `lineClassName` | `"rb-code__line"` | 生成する行ラッパーのクラス |
| `highlightClassName` | `"rb-code__line--highlighted"` | 強調行のクラス |
| `addedClassName` | `"rb-code__line--added"` | `[!code ++]` 行のクラス |
| `removedClassName` | `"rb-code__line--removed"` | `[!code --]` 行のクラス |
| `focusClassName` | `"rb-code__line--focused"` | フォーカス行のクラス |
| `language` | 未設定 | 指定した言語のブロックだけを対象にする |

```ts
codeAnnotations({ highlightClassName: "is-highlighted" });
```

## code-enhance との併用

`@riebeckite/plugin-code-annotations` は
`@riebeckite/plugin-code-enhance` を import せず、依存もしません。素の
`<pre><code>` のテキストと、`rehype-pretty-code` が出力する `.line` ラッパーの
両方を検出します。

- 行ラッパーがすでにある場合は、既存のクラスに追記し、既存の `data-line` を
  そのまま使います。
- ない場合は、コード本文を
  `<span class="rb-code__line" data-line="N">` に分割します。

`rehype-pretty-code` は `<code>` 要素を差し替えるため、注釈プランは保持される
フェンスメタにも複製します。これにより code-enhance の後でも注釈が適用されます。
プラグイン配列では `codeEnhance()` の後に `codeAnnotations()` を置いてください。
`order: 10` により、順序に関わらず強調処理の後に実行されます。

## 公開 API

- `codeAnnotations(options?)` / `codeAnnotationsPlugin(options?)` — プラグインファクトリ
- `remarkCodeAnnotations(options?)` — remark 変換
- `rehypeCodeAnnotations(options?)` — rehype 変換
- `parseCodeAnnotations(meta)` — フェンスメタをプランに変換
- `parseLineRanges(spec)` — `1,3-5` を行番号に変換
- `collectCodeAnnotations(meta, code)` — メタとインラインマーカーをまとめて解析
- `resolveCodeAnnotationsOptions(options?)` — 既定値を補完
- 型: `CodeAnnotationsOptions`、`ResolvedCodeAnnotationsOptions`、
  `CodeAnnotationPlan`、`CodeAnnotationKind`

## 関連資料

- [プラグインシステム](../../../docs/docs/reference/plugin-api.ja.md)
- [`@riebeckite/plugin-code-enhance`](../code-enhance/README_ja.md)

