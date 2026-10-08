# Obsidian Markdown

ウィキリンク、コールアウト、インラインタグ、ブロック参照など、Obsidian の Markdown 記法を変換するプラグインです。

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

- `[[Note]]`、`[[Note|別名]]` — 対象の解決済み canonical permalink へのリンク（class `wikilink`）。見出し・ブロック ID のフラグメントも扱う。lookup は slug で行い、`href` は解決済み permalink
- `![[Note]]` — 最大 3 階層まで安全に再帰描画するノート埋め込み
- `![[image.png]]` — `assetBase` 配下の画像、`[[file.pdf]]` — 添付ファイル用レンダラーまたはダウンロードリンク
- `> [!note]` — コールアウト。`+` と `-` で折りたたみ状態を指定できる
- `#tag`、`#nested/tag` — タグページへのリンク
- 段落末尾の `^block-id` — 要素の `id` と `data-block-id`

解決できないウィキリンクは `wikilink-broken` クラスを付けたリンクになります。添付カードやメディア表示が必要なら、別途対応する添付プラグインを登録してください。

## オプション

| オプション | 既定値 | 内容 |
| --- | --- | --- |
| `assetBase` | `"/"` | 画像ウィキリンクの URL の基点 |
| `callout.defaultTitles` | 組み込みの対応表 | コールアウトの既定見出し |
| `tag.tagBase` | `"/tags/"` | タグページの基点 |
| `tag.onTag` | なし | 見つけたタグごとに呼ぶ関数 |

## 公開 API

- `obsidianMarkdown(options?)` / `obsidianMarkdownPlugin` — プラグインファクトリ
- `ObsidianMarkdownOptions`、`CalloutOptions`、`TagOptions`、`WikilinkOptions`、`WikilinkFragment` — 型

## 関連資料

- [プラグインシステム](../reference/plugin-api.ja.md)
- [`@riebeckite/plugin-attachment`](./attachment.ja.md)
