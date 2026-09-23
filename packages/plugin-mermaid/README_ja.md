# @riebeckite/plugin-mermaid

` ```mermaid ` code block 向けの Mermaid diagram 描画。

[English](./README_en.md)

## 概要

`mermaid()` は mermaid code block を `<figure class="rr-mermaid">` に変換し、
SVG として描画します。デフォルトは build 時レンダリングで、失敗時は
client 側へ自動フォールバックします。`order: -10` で実行されます。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { mermaid } from "@riebeckite/plugin-mermaid";

export default defineConfig({
  // ...
  plugins: [
    mermaid({
      render: "build",
      theme: { light: "default", dark: "dark" },
    }),
  ],
});
```

## 動作

### Build

- ` ```mermaid ` の `<pre>` を `figure.rr-mermaid` に置き換えます。
  - `figcaption.rr-mermaid__caption` — code block の title か source 内の
    `%% caption: ...` 行
  - `div.rr-mermaid__canvas` — diagram（`role="img"`。caption があれば
    それを label にする）
  - `details.rr-mermaid__fallback` — 折りたたみ可能な diagram source
- `render` が `"build"` / `"both"` のとき build 時に static SVG を描画します。
  SVG は sanitizer を通し（script・`foreignObject`・event handler・
  `javascript:` URL を除去）、Mermaid は `securityLevel: "strict"` で
  実行されます
- 不正な diagram は warning を出力し、diagnostic
  （`ruleId: "invalid-mermaid"`）を報告して、figure を
  `data-mermaid="pending"` のままにして client fallback に任せます

### Client (`initMermaidDiagrams`)

- `globalThis.mermaid` や注入された instance が無ければ CDN（jsDelivr、
  Mermaid 11）から Mermaid を読み込みます
- `[data-mermaid="pending"]` の figure を描画します。失敗時は
  `data-mermaid="error"`（CSS による placeholder 表示）になります
- `theme` が `{ light, dark }` の場合は `html[data-theme]` か
  `prefers-color-scheme` で選びます

## オプション

| オプション | 型 | デフォルト | 説明 |
| ---------- | -- | ---------- | ---- |
| `render` | `"build" \| "client" \|"both"` | `"build"` | diagram をいつ描画するか |
| `theme` | `string \| { light: string; dark: string }` | `{ light: "default", dark: "dark" }` | Mermaid theme |
| `caption` | `boolean` | `true` | title / `%% caption:` を `figcaption` に表示 |
| `fallback` | `boolean` | `true` | `<details>` で diagram source を表示 |

`render` mode:

- `"build"` / `"both"` — build 時に SVG を描画。失敗した diagram は client
  描画へフォールバック
- `"client"` — build 時描画をスキップし、ブラウザでのみ描画

## エクスポート

- `mermaid(options?)` — plugin factory
- 型: `MermaidOptions`、`MermaidClientOptions`、`MermaidRenderMode`、
  `MermaidTheme`

## 関連

- [Plugin ガイド](../../docs/plugins_jp.md)
