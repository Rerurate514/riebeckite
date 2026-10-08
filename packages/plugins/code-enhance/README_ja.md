# @riebeckite/plugin-code-enhance

<!-- Generated from docs/docs/plugins/code-enhance.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Shiki によるシンタックスハイライトへ、コピー、折り返し、折りたたみなどの操作を加えるプラグインです。

[English](./README.md)

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

## 表示と操作

- Shiki のテーマによる色付け、行番号、メタデータによる行・文字の強調
- `+` と `-` で始まる行の差分表示
- コピー、折り返し、任意の折りたたみ
- `bash`、`console`、`sh` などを端末風に表示し、必要に応じて `$` を付ける
- キーボードで内容を確認できるよう、`<pre>` をフォーカス可能にする

## オプション

| オプション | 型 | 既定値 | 内容 |
| --- | --- | --- | --- |
| `theme` | `string | { light: string; dark: string }` | `{ light: "github-light", dark: "github-dark" }` | Shiki テーマ |
| `lineNumbers` | `boolean` | `false` | 行番号を表示する |
| `copyButton` | `boolean` | `true` | コピーボタンを表示する |
| `filename` | `boolean` | `true` | ヘッダーにファイル名を表示する |
| `lineHighlight` | `boolean` | `true` | メタデータによる行・文字の強調を適用する |
| `diffHighlight` | `boolean` | `true` | `+` / `-` で始まる行を色付けする |
| `collapsible` | `boolean` | `false` | 折りたたみボタンを追加する |
| `terminal` | `boolean` | `true` | シェル言語を端末風に表示する |
| `commandPrompt` | `boolean` | `true` | 端末の各行に `$` を付ける |
| `wrapToggle` | `boolean` | `true` | 折り返し切替ボタンを表示する |
| `defaultCollapsed` | `boolean` | `false` | `collapsible` 有効時に折りたたんで開始する |
| `copyLabel` | `string` | `"Copy"` | クライアントに渡すコピー前の文言 |
| `copiedLabel` | `string` | `"Copied"` | コピー後に表示する文言 |

## クライアント側の初期化

`codeEnhance()` は `copyLabel` と `copiedLabel` をクライアントエントリーへ渡します。`initCodeEnhance(options?)` はコピー、折り返し、折りたたみボタンのために document 全体のクリックハンドラーを登録します。直接呼び出す場合も同じ二つの文言を指定できます。

## 公開 API

- `codeEnhance(options?)` — プラグインファクトリ
- `rehypeCodeEnhance(options?)` — Rehype 変換
- `initCodeEnhance(options?)` — ブラウザ初期化関数
- `DEFAULT_COPY_LABEL`、`DEFAULT_COPIED_LABEL` — 既定のコピー文言
- `CodeEnhanceOptions`、`CodeEnhanceClientOptions`、`CodeEnhanceTheme` — 型

## 関連資料

- [プラグインシステム](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.ja.md)
