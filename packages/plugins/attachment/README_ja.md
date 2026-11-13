# @riebeckite/plugin-attachment

<!-- Generated from docs/docs/plugins/attachment.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Obsidian 形式の添付ファイルリンクを、ダウンロードリンクや添付カードとして表示するプラグインです。

[English](./README.md)

## 概要

`[report.pdf](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/report.pdf.ja.md)` や `![report.pdf](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/report.pdf.ja.md)` のような画像以外のウィキリンクを扱います。`@riebeckite/plugin-obsidian-markdown` がリンク先を添付ファイルとして解決したとき、このプラグインが表示を引き受けます。プラグインを登録しない場合も通常のダウンロードリンクにはなりますが、埋め込み用のカードは作られません。

## インストール

```sh
npm install @riebeckite/plugin-attachment
```

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

- `[attachment-example.txt](https://github.com/Rerurate514/riebeckite/blob/main/docs/assets/attachment-example.txt)` は、`download` 属性を持つ通常のリンクになります。
- `![attachment-example.txt](https://github.com/Rerurate514/riebeckite/blob/main/docs/assets/attachment-example.txt)` は、テキストファイルのコードブロックと、ファイル名、拡張子、サイズ、ダウンロードリンクを含むフッターになります。

以下のソースは、このページ上で実際に描画されます。

### ソース

````md
[[attachment-example.txt]]

![[attachment-example.txt]]
````

### 実行例

[attachment-example.txt](https://github.com/Rerurate514/riebeckite/blob/main/docs/assets/attachment-example.txt)

![attachment-example.txt](https://github.com/Rerurate514/riebeckite/blob/main/docs/assets/attachment-example.txt)

- 形式は拡張子を大文字にしたものです。
- カードのファイルサイズは `config.content.directory` 配下から読み取ります。パスは
  コンテンツディレクトリの外へ出られないよう検査され、読めないファイルのサイズは表示しません。
- プレビュー対象の拡張子の添付は、エスケープされたコードブロックと、その下のファイル名、形式、サイズ、ダウンロードリンクとして表示されます。256 KiB を超えるファイル、バイナリファイル、UTF-8 として読めないファイルは添付カードにフォールバックします。
- 埋め込みには、テーマが対象にできる安定した `rr-attachment` ルートフックが付きます。インラインの添付リンクには `rr-attachment-link` を使います。

スタイルは `style.css` に含まれます（インラインの添付リンクには `↓` の接尾辞も付きます）。

## オプション

| オプション | 型 | 既定値 | 内容 |
| --- | --- | --- | --- |
| `showSize` | `boolean` | `true` | 埋め込みカードにファイルサイズを表示するか |
| `preview` | `readonly string[] \| false` | `["txt", "log", "csv", "tsv", "json", "yaml", "yml", "toml", "ini", "xml"]` | コードブロックでプレビューする拡張子。`false` で無効化 |

## 公開 API

- `attachment(options?)` / `attachment`：プラグインファクトリ
- `AttachmentOptions`：オプションの型

## 関連資料

- [プラグインシステム](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.ja.md)
- [`@riebeckite/plugin-obsidian-markdown`](../obsidian-markdown/README_ja.md)
