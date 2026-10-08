# @riebeckite/plugin-media

<!-- Generated from docs/docs/plugins/media.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Obsidian の音声・動画埋め込みを、ブラウザ標準の HTML5 プレーヤーで表示するプラグインです。

[English](./README.md)

## できること

`![[music.mp3]]` や `![[movie.mp4]]` をメディア要素へ変換します。対応しない形式では `null` を返すため、後続の添付レンダラーまたは既定の表示に処理を任せられます。

## 設定

`media()` は既定の添付カードより先に動くため、Obsidian Markdown と添付ファイルのプラグインとあわせて登録します。

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

## 対応する拡張子

- 音声: `mp3`、`m4a`、`aac`、`ogg`、`oga`、`opus`、`wav`、`flac`
- 動画: `mp4`、`m4v`、`webm`、`ogv`、`mov`

## オプション

| オプション | 型 | 既定値 | 内容 |
| --- | --- | --- | --- |
| `preload` | `"none" \| "metadata" \| "auto"` | `lazy: true` なら `"none"`、それ以外は `"metadata"` | メディア要素の `preload` 属性 |
| `lazy` | `boolean` | `true` | 未指定時に初期読み込みを抑える |
| `showCaption` | `boolean` | `true` | キャプションを表示するか |
| `showDownload` | `boolean` | `true` | ダウンロードリンクを表示するか |
| `showOpenOriginal` | `boolean` | `true` | 元ファイルへのリンクを表示するか |

## 時刻指定について

レンダラーへ渡された `#t=10` や `#10,20` はメディアフラグメントとして URL に残します。ただし、現在の Obsidian ウィキリンク処理は添付ファイルのフラグメントをレンダラーへ渡しません。`![[movie.mp4#t=10]]` を完全に扱うには、処理パイプライン側の拡張が必要です。

## 公開 API

- `media(options?)` / `mediaPlugin` — プラグインファクトリ
- `MediaOptions`、`MediaPreload` — 型

## 関連リンク

- [プラグイン API](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.ja.md)
