# @riebeckite/plugin-media

<!-- Generated from docs/docs/plugins/media.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Obsidian の音声・動画埋め込みを、ブラウザ標準の HTML5 プレーヤーで表示するプラグインです。

[English](./README.md)

## できること

`![music.mp3](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/music.mp3.ja.md)` や `![movie.mp4](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/movie.mp4.ja.md)` をメディア要素へ変換します。対応しない形式では `null` を返すため、後続の添付レンダラーまたは既定の表示に処理を任せられます。

## インストール

```sh
npm install @riebeckite/plugin-media
```

## 設定

`media()` は既定の添付カードより先に実行されるため、Obsidian Markdown と添付ファイルのプラグインとあわせて登録します。

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

## 実行例

音声はブラウザ標準のプレイヤーで再生できます。動画も同じ埋め込み記法で、拡張子だけが変わります。

![media-example.wav](https://github.com/Rerurate514/riebeckite/blob/main/docs/assets/media-example.wav)

## オプション

| オプション | 型 | 既定値 | 内容 |
| --- | --- | --- | --- |
| `preload` | `"none" \| "metadata" \| "auto"` | `lazy: true` なら `"none"`、それ以外は `"metadata"` | メディア要素の `preload` 属性 |
| `lazy` | `boolean` | `true` | `preload` 未指定時に初期読み込みを抑える |
| `showCaption` | `boolean` | `true` | キャプションを表示するか |
| `showDownload` | `boolean` | `true` | ダウンロードリンクを表示するか |
| `showOpenOriginal` | `boolean` | `true` | 元ファイルへのリンクを表示するか |

## 時刻指定について

Obsidian の時刻フラグメントは、そのままメディアのソース URL に引き継がれます。

```md
![[movie.mp4#t=10]]
![[movie.mp4#t=10,20]]
```

- `t=10`（または `start=10`）は 10 秒から再生し、`t=10,20` は 10〜20 秒の範囲を指定します
- 値は秒（`90`）のほか、`m:ss` や `h:mm:ss` でも指定できます
- フラグメントは検証・正規化してから URL に付加し、不正なパラメータは無視します
- `@riebeckite/plugin-obsidian-markdown` が添付レンダラーへフラグメントを渡すため、追加の設定は不要です

## 互換性

| 機能 | Obsidian | Riebeckite | 補足 |
| --- | --- | --- | --- |
| `![movie.mp4](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/movie.mp4.ja.md)` | 対応 | 完全 | |
| `![music.mp3](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/music.mp3.ja.md)` | 対応 | 完全 | |
| `![movie.mp4#t=10](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/movie.mp4.ja.md#t=10)` | 対応 | 完全 | |
| `![movie.mp4#t=10,20](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/movie.mp4.ja.md#t=10,20)` | 対応 | 完全 | |
| ブラウザのコーデック対応 | — | 一部 | 再生可否はブラウザ依存。非対応形式は添付カードにフォールバック |

## 公開 API

- `media(options?)` / `media`：プラグインファクトリ
- `MediaOptions`、`MediaPreload`：型

## 関連リンク

- [プラグイン API](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.ja.md)
