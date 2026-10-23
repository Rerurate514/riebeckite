---
date: 2026-10-08
title: Attachment
---
# Attachment

Obsidian 形式の添付ファイルリンクを、ダウンロードリンクや添付カードとして表示するプラグインです。

[English](./attachment.md)

## 概要

`[[report.pdf]]` や `![[report.pdf]]` のような画像以外のウィキリンクを扱います。`@riebeckite/plugin-obsidian-markdown` がリンク先を添付ファイルとして解決したとき、このプラグインが表示を引き受けます。プラグインを登録しない場合も通常のダウンロードリンクにはなりますが、埋め込み用のカードは作られません。

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

## リンクと埋め込みの表示

- `[[attachment-example.txt]]` は、`download` 属性を持つ通常のリンクになります。
- `![[attachment-example.txt]]` は、拡張子、ファイル名、ダウンロードリンクを含む添付カードになります。

以下のソースは、このページ上で実際に描画されます。

#### ソース

````md
[[attachment-example.txt]]

![[attachment-example.txt]]
````

#### 実行例

[[attachment-example.txt]]

![[attachment-example.txt]]

- 形式は拡張子を大文字にしたものです。
- カードのファイルサイズは `config.content.directory` 配下から読み取ります。パスは
  コンテンツディレクトリの外へ出られないよう検査され、読めないファイルのサイズは表示しません。
- 埋め込みカードには、テーマが対象にできる安定した `rr-attachment` ルートフックが付きます。インラインの添付リンクには `rr-attachment-link` を使います。

スタイルは `style.css` に含まれます（インラインの添付リンクには `↓` の接尾辞も付きます）。

## オプション

| オプション | 型 | 既定値 | 内容 |
| --- | --- | --- | --- |
| `showSize` | `boolean` | `true` | 埋め込みカードにファイルサイズを表示するか |

## 公開 API

- `attachment(options?)` / `attachmentPlugin`：プラグインファクトリ
- `AttachmentOptions`：オプションの型

## 関連資料

- [[plugin-api|プラグインシステム]]
- [`@riebeckite/plugin-obsidian-markdown`](./obsidian-markdown.ja.md)
