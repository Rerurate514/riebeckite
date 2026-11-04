---
date: 2026-10-08
title: Excalidraw
---
# Excalidraw

Obsidian の Excalidraw 埋め込みを SVG として表示するプラグインです。

[English](./excalidraw.md)

## できること

`![[drawing.excalidraw]]` のような埋め込みウィキリンクを検出し、ビルド時に SVG へ変換して出力します。通常のリンクや対象外のファイルは処理せず、添付ファイル用のレンダラーに任せます。

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

`style.css` を登録します。描画には Puppeteer 経由で `chrome-headless-shell` を起動します。ブラウザが見つからない場合は `puppeteer browsers install chrome-headless-shell` でインストールしてください。

## 読み込めるファイル

- `*.excalidraw`：`elements`、任意の `appState` と `files` を持つ JSON シーン
- `*.excalidraw.md`：Obsidian Excalidraw が保存する Markdown。`## Drawing` 内の `json` と `compressed-json` を読み取ります。

`![[drawing.excalidraw|800]]` なら幅を、`![[drawing.excalidraw|800x600]]` なら幅と高さを指定できます。ファイルがない、内容が不正、またはコンテンツディレクトリ外を指す場合は、エラー用の図とコンソールログを出力します。描画に使うフォントはビルド時に取得し、SVG に埋め込みます。

## 実行例

以下のソースは、ビルド時にインライン SVG として描画されます。

````md
![[HW]]
````

![[HW]]

## 単体ページとしての表示

Markdown として保存された Excalidraw の描画は、通常の Markdown ページではなく専用ページとして表示されます。プラグインはページ型（`excalidraw-document`）を登録し、パーマリンク末尾の `.excalidraw` を除いたパスを引き受けます。

- 判定: slug が `.excalidraw` で終わる（`*.excalidraw.md`）、または frontmatter に `excalidraw-plugin: parsed` がある
- `drawing.excalidraw.md`（パーマリンク `/drawing.excalidraw`）は `/drawing` で表示される
- ページ本文は自前の `<main>` と `<h1>` を持ち、埋め込みウィキリンクと同じビルド時 SVG 描画を再利用する

ページ型は通常のコンテンツルーティングより先に解決されるため、アプリ側のルート追加は不要です。対象は公開エントリのみです。

## 公開 API

- `excalidraw()`：プラグインファクトリ

## 関連資料

- [[plugin-api|プラグインシステム]]
- [`@riebeckite/plugin-obsidian-markdown`](./obsidian-markdown.ja.md)
- [`@riebeckite/plugin-attachment`](./attachment.ja.md)
