# @riebeckite/plugin-attachment

Obsidian 形式の添付ファイルリンクを、ダウンロードリンクや添付カードとして表示するプラグインです。

[English](./README.md)

## まず何を解決するか

`[[report.pdf]]` や `![[report.pdf]]` のような画像以外のウィキリンクを扱います。`@riebeckite/plugin-obsidian-markdown` がリンク先を添付ファイルとして解決したとき、このプラグインが表示を引き受けます。未登録でも通常のダウンロードリンクにはなりますが、埋め込み用のカードは作られません。

## 設定

Obsidian Markdown プラグインとともに登録します。

```ts
import { defineConfig } from "@riebeckite/core";
import { attachment } from "@riebeckite/plugin-attachment";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";

export default defineConfig({
  // ...
  plugins: [obsidianMarkdown(), attachment()],
});
```

## リンクと埋め込みで表示を分ける

- `[[report.pdf]]` は、`download` 属性を持つ通常のリンクになります。
- `![[report.pdf]]` は、拡張子、ファイル名、ダウンロードリンクを含む添付カードになります。

カードのファイルサイズは `config.content.directory` 配下から読み取ります。パスはコンテンツディレクトリの外へ出られないよう検査され、読めないファイルのサイズは表示しません。

## オプション

| オプション | 型 | 既定値 | 内容 |
| --- | --- | --- | --- |
| `showSize` | `boolean` | `true` | 埋め込みカードにファイルサイズを表示するか |

## 公開 API

- `attachment(options?)` / `attachmentPlugin` — プラグインファクトリ
- `AttachmentOptions` — オプションの型

## 関連資料

- [プラグインシステム](../../../docs/docs/reference/plugin-api.md)
- [`@riebeckite/plugin-obsidian-markdown`](../obsidian-markdown/README_ja.md)

