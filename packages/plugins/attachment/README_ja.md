# @riebeckite/plugin-attachment

<!-- Generated from docs/docs/plugins/attachment.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Obsidian 形式の添付ファイルリンクを、ダウンロードリンクや添付カードとして表示するプラグインです。

[English](./README.md)

## 概要

`[report.pdf](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/report.pdf.ja.md)` や `![report.pdf](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/report.pdf.ja.md)` のような画像以外のウィキリンクを扱います。`@riebeckite/plugin-obsidian-markdown` がリンク先を添付ファイルとして解決したとき、このプラグインが表示を引き受けます。プラグインを登録しない場合も通常のダウンロードリンクにはなりますが、埋め込み用のカードは作られません。

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

- `[attachment-example.txt](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/attachment-example.txt.ja.md)` は、`download` 属性を持つ通常のリンクになります。
- `![attachment-example.txt](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/attachment-example.txt.ja.md)` は、拡張子、ファイル名、ダウンロードリンクを含む添付カードになります。

以下のソースは、このページ上で実際に描画されます。

#### ソース

````md
[[attachment-example.txt]]

![[attachment-example.txt]]
````

#### 実行例

[attachment-example.txt](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/attachment-example.txt.ja.md)

![attachment-example.txt](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/attachment-example.txt.ja.md)

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

- [プラグインシステム](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.ja.md)
- [`@riebeckite/plugin-obsidian-markdown`](../obsidian-markdown/README_ja.md)
