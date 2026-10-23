---
date: 2026-10-08
title: Obsidian Markdown
---
# Obsidian Markdown

ウィキリンク、コールアウト、インラインタグ、ブロック参照など、Obsidian 独自の Markdown 記法を変換するプラグインです。

[English](./obsidian-markdown.md)

## 設定

```ts
import { defineConfig } from "@riebeckite/core";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";

export default defineConfig({
  // ...
  plugins: [obsidianMarkdown()],
});
```

この変換は `order: -20` で動くため、ほかの Markdown プラグインより先に Obsidian 記法を解釈します。

## 主な記法

- `[[Note]]`、`[[Note|別名]]`：対象の解決済み canonical permalink へのリンクです（クラスは `rr-obsidian-wikilink`）。見出しやブロック ID のフラグメントも扱います。対象は slug で検索し、`href` には解決済みの permalink を使います
- `![[Note]]`：ノートの埋め込みです。最大 3 階層まで、循環を避けながら再帰的に描画します
- `![[image.png]]`：`assetBase` 配下の画像になります。`[[file.pdf]]` は添付ファイル用のレンダラー、またはダウンロードリンクになります
- `> [!note]`：コールアウトです。`+` と `-` で折りたたみ状態を指定できます
- `#tag`、`#nested/tag`：タグページへのリンクになります
- 段落末尾の `^block-id`：要素の `id` と `data-block-id` になります

解決できないウィキリンクは `rr-obsidian-wikilink--broken` クラスを付けたリンクになります。添付カードやメディア表示が必要なら、別途対応する添付プラグインを登録してください。

ノート・画像・未解決の埋め込みには、プラグインが既定の CSS を提供します。ノート埋め込みには、生成コンテンツではなく実際の DOM テキストとして `Embedded: <slug>` を表示し、支援技術からもラベルを読めるようにします。

テーマは `rr-callout` のルート要素に `--rr-callout-title-color`、
`--rr-callout-title-font-family`、`--rr-callout-title-font-size`、
`--rr-callout-title-font-weight`、`--rr-callout-title-letter-spacing`、
`--rr-callout-title-text-transform`、`--rr-callout-icon-color` を指定して見た目を
調整できます。コールアウトの子要素は選択しないでください。

## オプション

| オプション | 既定値 | 内容 |
| --- | --- | --- |
| `assetBase` | `"/"` | 画像ウィキリンク URL の基点 |
| `callout.defaultTitles` | 組み込みの対応表 | コールアウトの既定見出し |
| `tag.tagBase` | `"/tags/"` | タグページの基点 |
| `tag.onTag` | なし | 見つけたタグごとに呼ぶ関数 |

## 公開 API

- `obsidianMarkdown(options?)` / `obsidianMarkdownPlugin`：プラグインファクトリ
- `ObsidianMarkdownOptions`、`CalloutOptions`、`TagOptions`、`WikilinkOptions`、`WikilinkFragment`：型

## 関連資料

- [[plugin-api|プラグインシステム]]
- [`@riebeckite/plugin-attachment`](./attachment.ja.md)
