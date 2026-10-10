# @riebeckite/plugin-attachment

<!-- Generated from docs/docs/plugins/attachment.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

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

- 形式は大文字にした拡張子です。
- カードのファイルサイズは `config.content.directory` 配下から読み取ります。パスは
  コンテンツディレクトリの外へ出られないよう検査され、読めないファイルのサイズは表示しません。
- 埋め込みカードには、Theme が対象にできる安定した `rr-attachment` ルートフックが付きます。

スタイルは `style.css` に同梱されます（インラインの添付リンクには `↓` 接尾辞も付きます）。

## オプション

| オプション | 型 | 既定値 | 内容 |
| --- | --- | --- | --- |
| `showSize` | `boolean` | `true` | 埋め込みカードにファイルサイズを表示するか |

## 公開 API

- `attachment(options?)` / `attachmentPlugin` — プラグインファクトリ
- `AttachmentOptions` — オプションの型

## 関連資料

- [プラグインシステム](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.ja.md)
- [`@riebeckite/plugin-obsidian-markdown`](../obsidian-markdown/README_ja.md)
