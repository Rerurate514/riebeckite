# @riebeckite/plugin-media

Obsidian の audio / video attachment embed を HTML5 media player として描画します。

[English](./README_en.md)

## 概要

`media()` は attachment renderer を提供します。`![[music.mp3]]` や
`![[movie.mp4]]` など、Web 標準 player で再生できる代表的な media attachment だけを
処理し、未対応ファイルでは `null` を返して後続 renderer / fallback に委ねます。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { attachment } from "@riebeckite/plugin-attachment";
import { media } from "@riebeckite/plugin-media";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";

export default defineConfig({
  // ...
  plugins: [obsidianMarkdown(), media(), attachment()],
});
```

`media()` は `order: -10` で、既定の attachment card より先に実行されます。

## 対応形式

- audio: `mp3`, `m4a`, `aac`, `ogg`, `oga`, `opus`, `wav`, `flac`
- video: `mp4`, `m4v`, `webm`, `ogv`, `mov`

## オプション

| オプション | 型 | デフォルト | 説明 |
| ---------- | -- | ---------- | ---- |
| `preload` | `"none" \| "metadata" \| "auto"` | `lazy: true` なら `"none"`、それ以外は `"metadata"` | `<audio>` / `<video>` の `preload` |
| `lazy` | `boolean` | `true` | `preload` 未指定時に `"none"` を使い、初期ロードを抑える |
| `showCaption` | `boolean` | `true` | caption を表示 |
| `showDownload` | `boolean` | `true` | download link を表示 |
| `showOpenOriginal` | `boolean` | `true` | original file への link を表示 |

## timestamp fragment

renderer に `#t=10` や `#10,20` のような fragment が届いた場合は media fragment として
source URL に保持します。現在の Obsidian wikilink pipeline は attachment fragment を
renderer へ渡さないため、完全な `![[movie.mp4#t=10]]` 対応には pipeline 側の拡張が必要です。

## エクスポート

- `media(options?)` / `mediaPlugin` — plugin factory
- 型: `MediaOptions`, `MediaPreload`
