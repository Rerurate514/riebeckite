# @riebeckite/plugin-obsidian-markdown

Obsidian 風 Markdown 対応: wikilink・callout・inline tag・block reference。

[English](./README_en.md)

## 概要

`obsidianMarkdown()` は Obsidian の記法を build 時に変換する remark
transform を登録します。`order: -20` で実行されるため、他の Markdown
plugin より先に処理されます。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";

export default defineConfig({
  // ...
  plugins: [obsidianMarkdown()],
});
```

## 記法

### wikilink

- `[[Note]]` → `/Note` への link（class `wikilink`）。alias は
  `[[Note|Alias]]`
- fragment: `[[Note#Heading]]` → `#heading-slug`、
  `[[Note#^block-id]]` → `#block-id`
- `![[Note]]` → note embed。core pipeline が対象 note を再帰的に描画します
  （最大 depth 3、循環は安全）。未解決の embed は placeholder の link / text
  になります
- `![[image.png]]` → `assetBase` 配下の `<img>`
- `[[image.png]]` → asset URL への link
- `[[file.pdf]]` / `![[file.pdf]]` → `renderAttachment` を提供する plugin
  （`@riebeckite/plugin-attachment` 参照）が描画。なければ単純な download link
- 解決できない対象 → class `wikilink wikilink-broken` の link

### callout

```md
> [!note] 任意のタイトル
> Callout の本文。

> [!warning]- 初期状態で折りたたみ
> もう一段落。
```

出力は `div.callout.callout-{type}`（`data-callout` 付き）で、`+` / `-`
マーカーには `is-collapsible` / `is-collapsed` が付きます。タイトルは組み込み
デフォルト（`note`、`tip`、`warning`、`danger`、`bug`、`quote` など）に
フォールバックします。

### inline tag

- `#tag`、`#nested/tag` → `{tagBase}{slug 化した tag}` への link
  （class `tag`、`data-tag` 付き）
- 数字のみの tag は無視。末尾の `/` と `-` は取り除きます
- 各 tag で任意の `onTag` callback が呼ばれます

### block reference

- ブロック末尾の `^block-id` はテキストから除去され、要素の `id` と
  `data-block-id` に設定されます

## オプション

| オプション | 型 | デフォルト | 説明 |
| ---------- | -- | ---------- | ---- |
| `assetBase` | `string` | `"/"` | image wikilink URL の base path |
| `callout.defaultTitles` | `Record<string, string>` | 組み込み map | callout のデフォルト title を上書き |
| `tag.tagBase` | `string` | `"/tags/"` | tag ページの base path |
| `tag.onTag` | `(tag: string) => void` | — | 検出した各 tag で呼ばれる callback |

## エクスポート

- `obsidianMarkdown(options?)` / `obsidianMarkdownPlugin` — plugin factory
- 型: `ObsidianMarkdownOptions`、`CalloutOptions`、`TagOptions`、
  `WikilinkOptions`、`WikilinkFragment`

## 関連

- [Plugin ガイド](../../docs/plugins_jp.md)
- [`@riebeckite/plugin-attachment`](../plugin-attachment/README_ja.md)
