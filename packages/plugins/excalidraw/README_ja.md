# @riebeckite/plugin-excalidraw

Obsidian wikilink 向けの Excalidraw drawing 描画。

[English](./README_en.md)

## 概要

`excalidraw()` は `renderAttachment` hook を提供します。
`@riebeckite/plugin-obsidian-markdown` が embed wikilink
（`![[drawing.excalidraw]]`）を Excalidraw ファイルに解決したときに使われ、
drawing の payload を持つ placeholder figure を出力します。client entry が
SVG に描画します。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { excalidraw } from "@riebeckite/plugin-excalidraw";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";

export default defineConfig({
  // ...
  plugins: [obsidianMarkdown(), excalidraw()],
});
```

`style.css` と client entry（`initExcalidraw`）が登録され、アプリが page
初期化時に呼び出します。

## 対応形式

### `*.excalidraw` — 素の JSON scene

`elements`・任意の `appState`・`files` を持つ compact な Excalidraw export。

### `*.excalidraw.md` — Obsidian Excalidraw の drawing

Obsidian の "Excalidraw" plugin は drawing を Markdown に保存します。
`## Drawing` fenced code block を取り出し、`json` と lz-string の
`compressed-json` の両方に対応しています。

## 動作

### Build（`renderAttachment`）

- `.excalidraw` / `.excalidraw.md` で終わる embed wikilink（`![[...]]`）のみ
  処理します。それ以外は `null` を返し、attachment plugin に
  フォールバックします
- `config.content.directory` 配下のファイルを読み取ります
  （path traversal 対策済み）
- scene を parse して次を出力します

  ```html
  <figure class="rr-excalidraw" data-excalidraw="pending" data-excalidraw-lazy="true">
    <div class="rr-excalidraw__canvas" role="img" aria-label="drawing.excalidraw"></div>
    <script type="application/json" class="rr-excalidraw__payload">{"elements":[...],"appState":{...},"files":{...}}</script>
  </figure>
  ```

- wikilink の alias でサイズを指定できます:
  `![[drawing.excalidraw|800]]`（width）または
  `![[drawing.excalidraw|800x600]]`（width x height）
- ファイル欠落・不正な scene・directory 外の path は error placeholder を
  描画し、console に出力します

### Client（`initExcalidraw`）

- `@excalidraw/excalidraw` の `exportToSvg` で pending figure を SVG に描画
- `data-excalidraw-lazy="false"` の figure は即時描画。その他は viewport に
  入ったときに描画（`IntersectionObserver`、margin 200px）
- 成功 → `data-excalidraw="ready"`（SVG が空の canvas を置き換え）
- 失敗 → `data-excalidraw="error"` と placeholder メッセージ

## オプション

| オプション | 型 | デフォルト | 説明 |
| ---------- | -- | ---------- | ---- |
| `lazy` | `boolean` | `true` | ブラウザで描画する際、即時ではなく figure が viewport に入った時に lazy 描画する |

## エクスポート

- `excalidraw(options?)` / `excalidrawPlugin` — plugin factory
- 型: `ExcalidrawOptions`

## 関連

- [Plugin ガイド](../../docs/plugins_jp.md)
- [`@riebeckite/plugin-obsidian-markdown`](../plugin-obsidian-markdown/README_ja.md)
- [`@riebeckite/plugin-attachment`](../plugin-attachment/README_ja.md)