# @riebeckite/plugin-mermaid

` ```mermaid ` code block 向けの Mermaid diagram 描画。

[English](./README_en.md)

## 概要

`mermaid()` は mermaid code block を `<figure class="rr-mermaid">` に変換し、
SVG として描画します。デフォルトは headless browser による build 時レンダリングで、
失敗時は client 側へ自動フォールバックします。`order: -10` で実行されます。

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
- `render` が `"build"` / `"both"` のとき、Puppeteer の headless Chromium 上で
  Mermaid browser API を実行し、Chromium の layout engine で static SVG を描画します。
  JSDOM polyfill や自前 `getBBox` 推定は使いません
- Mermaid は `securityLevel: "strict"`、指定 theme、transparent background、
  diagram ごとの一意な SVG id で実行されます
- 不正な diagram は `ruleId: "invalid-diagram"`、Chromium 等の renderer
  障害は `ruleId: "renderer-error"` として区別して diagnostic を報告します。
  build SVG が得られない場合は `data-mermaid="pending"` として client fallback
  に任せます

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
| `render` | `"build" \| "client" \| "both"` | `"build"` | diagram をいつ描画するか |
| `theme` | `string \| { light: string; dark: string }` | `{ light: "default", dark: "dark" }` | Mermaid theme |
| `caption` | `boolean` | `true` | title / `%% caption:` を `figcaption` に表示 |
| `fallback` | `boolean` | `true` | `<details>` で diagram source を表示 |

`render` mode:

- `"build"` — build 時に SVG を描画。失敗した diagram は client 描画へフォールバック
- `"client"` — build 時描画をスキップし、ブラウザでのみ描画
- `"both"` — 後方互換の alias。現状は `"build"` と同じく build 優先 +
  失敗時 client fallback

## エクスポート

- `mermaid(options?)` — plugin factory
- 型: `MermaidOptions`、`MermaidClientOptions`、`MermaidRenderMode`、
  `MermaidTheme`

## 関連

- [Plugin ガイド](../../docs/plugins_jp.md)
