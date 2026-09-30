# @riebeckite/plugin-code-enhance

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

## 主なオプション

| オプション | 既定値 | 内容 |
| --- | --- | --- |
| `theme` | GitHub の明暗テーマ | Shiki テーマ。文字列または `{ light, dark }` |
| `lineNumbers` | `false` | 行番号を表示するか |
| `copyButton` | `true` | コピーボタンを表示するか |
| `filename` | `true` | 見出しにファイル名を表示するか |
| `lineHighlight` / `diffHighlight` | `true` | 強調表示・差分表示を有効にするか |
| `collapsible` / `defaultCollapsed` | `false` | 折りたたみと初期状態 |
| `terminal` / `commandPrompt` | `true` | 端末風表示と `$` の付与 |
| `wrapToggle` | `true` | 折り返し切替を表示するか |

`initCodeEnhance({ copyLabel, copiedLabel })` では、コピー前後のボタン文言を変更できます。

## 公開 API

- `codeEnhance(options?)` — プラグインファクトリ
- `rehypeCodeEnhance(options?)` — Rehype 変換
- `initCodeEnhance(options?)` — ブラウザ初期化関数
- `CodeEnhanceOptions`、`CodeEnhanceClientOptions`、`CodeEnhanceTheme` — 型

## 関連資料

- [プラグインシステム](../../../docs/ja/reference/plugin-api.md)
