# @riebeckite/plugin-excalidraw

Obsidian の Excalidraw 埋め込みを SVG として表示するプラグインです。

[English](./README.md)

## できること

`![[drawing.excalidraw]]` のような埋め込みウィキリンクを検出し、図のデータを含むプレースホルダーを出力します。ブラウザ側の `initExcalidraw` が、そのプレースホルダーを SVG に置き換えます。通常のリンクや対象外のファイルは処理せず、添付ファイル用のレンダラーに任せます。

## 設定

```ts
import { defineConfig } from "@riebeckite/core";
import { excalidraw } from "@riebeckite/plugin-excalidraw";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";

export default defineConfig({
  // ...
  plugins: [obsidianMarkdown(), excalidraw()],
});
```

## 読み込めるファイル

- `*.excalidraw` — `elements`、任意の `appState` と `files` を持つ JSON シーン
- `*.excalidraw.md` — Obsidian Excalidraw が保存する Markdown。`## Drawing` 内の `json` と `compressed-json` を読み取ります。

`![[drawing.excalidraw|800]]` なら幅を、`![[drawing.excalidraw|800x600]]` なら幅と高さを指定できます。ファイルがない、内容が不正、またはコンテンツディレクトリ外を指す場合は、エラー用プレースホルダーを表示します。

## 描画のタイミング

既定では、図が表示領域の近くに入ってから描画します。`IntersectionObserver` が使えない環境を含め、描画に失敗した要素は `data-excalidraw="error"` になり、エラー表示へ切り替わります。

| オプション | 型 | 既定値 | 内容 |
| --- | --- | --- | --- |
| `lazy` | `boolean` | `true` | 表示領域に近づいてから SVG を描画するか |

## 公開 API

- `excalidraw(options?)` / `excalidrawPlugin` — プラグインファクトリ
- `ExcalidrawOptions` — オプションの型

## 関連資料

- [プラグインシステム](../../../docs/ja/plugin-system.md)
- [`@riebeckite/plugin-obsidian-markdown`](../obsidian-markdown/README_ja.md)
- [`@riebeckite/plugin-attachment`](../attachment/README_ja.md)
