---
date: 2026-10-08
title: Code Enhance
---
# Code Enhance

Shiki のシンタックスハイライトに、ファイル名ヘッダーとコピー、折り返し、折りたたみの操作を加えたコードブロックを提供するプラグインです。

[English](./code-enhance.md)

## 設定

```ts
import { defineConfig } from "@riebeckite/core";
import { codeEnhance } from "@riebeckite/plugin-code-enhance";

export default defineConfig({
  // ...
  plugins: [codeEnhance({ lineNumbers: true, wrapToggle: true })],
});
```

`codeEnhance()` は `rehype-pretty-code` を使ってコードブロックを処理し、ファイル名と操作ボタンを持つ `.rr-code` 要素に整えます。ボタンの操作はクライアントエントリーが担当します。

## 実行例

次のブロックでは、ファイル名ヘッダー、行番号、行ハイライトを同時に使っています。

~~~ts title="greeting.ts" {2}
export function greet(name: string) {
  return `Hello, ${name}`;
}
~~~

## 表示と操作

- Shiki のテーマによる色付け、行番号、メタデータによる行・文字の強調
- `diff` コードブロックの `+` と `-` で始まる行の差分表示
- コピー、折り返し、任意の折りたたみ
- すべてのコードブロックを端末風の暗い配色で表示する
- `bash`、`console`、`sh` などのシェル言語の行に `$` を付ける
- キーボードで内容を確認できるよう、`<pre>` をフォーカス可能にする

テーマは `rr-code` のルート要素に `--rr-code-syntax` を指定すると、ハイライト済みコードの
子要素を選択せずに構文色を指定できます。

## オプション

| オプション | 型 | 既定値 | 内容 |
| --- | --- | --- | --- |
| `theme` | `string | { light: string; dark: string }` | `{ light: "github-light", dark: "github-dark" }` | Shiki テーマ |
| `lineNumbers` | `boolean` | `false` | 行番号を表示する |
| `copyButton` | `boolean` | `true` | コピーボタンを表示する |
| `filename` | `boolean` | `true` | ヘッダーにファイル名を表示する |
| `lineHighlight` | `boolean` | `true` | メタデータによる行・文字の強調を適用する |
| `diffHighlight` | `boolean` | `true` | `diff` コードブロックの `+` / `-` で始まる行を色付けする |
| `collapsible` | `boolean` | `false` | 折りたたみボタンを追加する |
| `commandPrompt` | `boolean` | `true` | シェル言語の行に `$` を付ける |
| `wrapToggle` | `boolean` | `true` | 折り返し切替ボタンを表示する |
| `defaultCollapsed` | `boolean` | `false` | `collapsible` 有効時に折りたたんで開始する |
| `copyLabel` | `string` | `"Copy"` | クライアントに渡すコピー前の文言 |
| `copiedLabel` | `string` | `"Copied"` | コピー後に表示する文言 |

## クライアント側の初期化

`codeEnhance()` は `copyLabel` と `copiedLabel` をクライアントエントリーへ渡します。`initCodeEnhance(options?)` はコピー、折り返し、折りたたみボタンのためにドキュメント全体のクリックハンドラーを登録します。直接呼び出す場合も同じ 2 つの文言を指定できます。

## 公開 API

- `codeEnhance(options?)`：プラグインファクトリ
- `rehypeCodeEnhance(options?)`：rehype 変換
- `initCodeEnhance(options?)`：ブラウザ初期化関数
- `DEFAULT_COPY_LABEL`、`DEFAULT_COPIED_LABEL`：既定のコピー文言
- `CodeEnhanceOptions`、`CodeEnhanceClientOptions`、`CodeEnhanceTheme`：型

## 関連資料

- [[plugin-api|プラグインシステム]]
