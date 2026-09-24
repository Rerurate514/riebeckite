# @riebeckite/plugin-code-enhance

強化された code block: Shiki highlighting に copy / wrap / collapse 操作を
備えた header を追加します。

[English](./README_en.md)

## 概要

`codeEnhance()` は [rehype-pretty-code](https://github.com/rehype-pretty-code/rehype-pretty-code)
（Shiki）を包み、各 figure を header と action button 付きの `.rr-code` に
後処理します。client entry が button を配線します。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { codeEnhance } from "@riebeckite/plugin-code-enhance";

export default defineConfig({
  // ...
  plugins: [
    codeEnhance({
      theme: { light: "github-light", dark: "github-dark" },
      lineNumbers: true,
      copyButton: true,
      filename: true,
      lineHighlight: true,
      diffHighlight: true,
      wrapToggle: true,
    }),
  ],
});
```

## 機能

- Shiki（rehype-pretty-code）による syntax highlighting
- ファイル名（code block の title、無ければ language）と action button の
  header
- Copy button（`Copied` フィードバック付き、client）
- Wrap 切り替え（client）
- Collapse / expand button（任意、client）
- 行番号（`data-line-number` gutter）
- pretty-code の meta（`{1,3}`、`[/re/]`）による行・文字の highlight
- 先頭が `+` / `-` の行の diff 着色
- `bash`・`console`・`sh`・`shell`・`terminal`・`zsh` 向け terminal 表示
  （反転 palette）と、空でない行への `$` prompt prefix
- キーボード操作用にフォーカス可能な `<pre>`（`tabindex="0"`）

## オプション

| オプション | 型 | デフォルト | 説明 |
| ---------- | -- | ---------- | ---- |
| `theme` | `string \| { light: string; dark: string }` | `{ light: "github-light", dark: "github-dark" }` | Shiki theme |
| `lineNumbers` | `boolean` | `false` | 行番号を表示 |
| `copyButton` | `boolean` | `true` | copy button を表示 |
| `filename` | `boolean` | `true` | header にファイル名を表示 |
| `lineHighlight` | `boolean` | `true` | meta による行・文字 highlight を適用 |
| `diffHighlight` | `boolean` | `true` | `+` / `-` 行を着色 |
| `collapsible` | `boolean` | `false` | collapse button を追加 |
| `terminal` | `boolean` | `true` | shell 言語の terminal 表示 |
| `commandPrompt` | `boolean` | `true` | terminal 行に `$` prompt prefix |
| `wrapToggle` | `boolean` | `true` | wrap toggle button を表示 |
| `defaultCollapsed` | `boolean` | `false` | 初期状態を折りたたみ（`collapsible` が必要） |

## Client

`initCodeEnhance(options?)` が document 全体の click handler を導入し、
copy / wrap / collapse button を処理します。

| オプション | 型 | デフォルト | 説明 |
| ---------- | -- | ---------- | ---- |
| `copyLabel` | `string` | `"Copy"` | copy button の label |
| `copiedLabel` | `string` | `"Copied"` | コピー後の label |

## エクスポート

- `codeEnhance(options?)` — plugin factory
- `rehypeCodeEnhance(options?)` — rehype transform
- `initCodeEnhance(options?)` — client initializer
- 型: `CodeEnhanceOptions`、`CodeEnhanceClientOptions`、`CodeEnhanceTheme`

## 関連

- [Plugin ガイド](../../docs/plugins_jp.md)
