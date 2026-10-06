# @riebeckite/plugin-pdf

Obsidian 形式の PDF 添付ファイルをインライン表示するプラグインです。

[English](./README.md)

## まず何を解決するか

`pdf()` は、埋め込み形式の PDF 添付（`![[report.pdf]]`）をダウンロード専用のカードではなく、ブラウザ標準の PDF ビューアでインライン表示します。ビルド時（SSR）だけで完結し、クライアント JavaScript は不要です。

`@riebeckite/plugin-obsidian-markdown` は画像でも Markdown でもないウィキリンクを汎用の `attachment` として解決するため、PDF は `.pdf` 拡張子で判定します。`kind: "pdf"` が直接渡された場合も処理するので、将来 PDF 専用の kind が導入されても動作します。

このレンダラーは `@riebeckite/plugin-attachment` と `@riebeckite/plugin-media` より先（`order: -20`）に実行されるため、PDF の埋め込みが汎用の添付カードに奪われることはありません。PDF 以外のダウンロードリンクを保つには `attachment()` を併用してください。

## 設定

```ts
import { defineConfig } from "@riebeckite/core";
import { attachment } from "@riebeckite/plugin-attachment";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import { pdf } from "@riebeckite/plugin-pdf";

export default defineConfig({
  // ...
  plugins: [obsidianMarkdown(), attachment(), pdf()],
});
```

## 出力

埋め込みは `![[report.pdf]]` のように書きます。

```html
<figure class="rr-pdf" data-pdf-path="..." style="--rr-pdf-height: 640px">
  <object
    class="rr-pdf__viewer"
    data="/assets/attachments/report.pdf#page=1"
    type="application/pdf"
    aria-label="report.pdf"
  >
    <a class="rr-pdf__fallback" href="..." download>Download PDF</a>
  </object>
  <figcaption class="rr-pdf__meta">
    <span class="rr-pdf__format">PDF</span>
    <span class="rr-pdf__name">report.pdf</span>
    <span class="rr-pdf__size">1.2 MB</span>
    <a class="rr-pdf__download" href="..." download>Download PDF</a>
  </figcaption>
</figure>
```

- `<object>` はブラウザ内蔵の PDF ビューアを使い、その中のリンクが PDF 表示に対応しない環境向けのフォールバックになります。
- ビューアの下には常にダウンロードリンクと、形式バッジ・ファイル名・サイズを表示します。サイズは `config.content.directory` 配下から読み取り、読めない場合は表示しません。
- `initialPage` と `toolbar` はビューア URL のフラグメント（`#page=2&toolbar=0`）として埋め込みます。これはブラウザ間で共通の慣習ですが、一部のビューアは解釈しないことがあります。
- 埋め込みには Theme が対象にできる安定した `rr-pdf` ルートフックが付きます。

通常のリンク（`[[report.pdf]]`）は `@riebeckite/plugin-attachment`（または Markdown のフォールバック）に委ね、従来どおりのダウンロードリンクにします。

## オプション

| オプション | 型 | 既定値 | 内容 |
| --- | --- | --- | --- |
| `height` | `string \| number` | `"640px"` | ビューアの高さ。数値は px、文字列は CSS の長さとして扱います。 |
| `initialPage` | `number` | `1` | 最初に開くページ番号。 |
| `toolbar` | `boolean` | `true` | `false` で `#toolbar=0` を付けてビューアのツールバーを隠します。 |
| `showMetadata` | `boolean` | `true` | ビューア下に形式バッジ・ファイル名・サイズを表示するか。 |
| `downloadLabel` | `string` | `"Download PDF"` | ダウンロードリンクのラベル。 |

スタイルは `style.css` に同梱されます。

## 公開 API

- `pdf(options?)` / `pdfPlugin` — プラグインファクトリ
- `buildPdfViewerUrl(url, options)` — ビューア URL の生成
- `isPdfRenderTarget(context)` — PDF 判定
- `renderPdf(context, options)` — レンダラー実装
- 型: `PdfOptions`、`ResolvedPdfOptions`

## 関連資料

- [プラグインシステム](../../../docs/docs/reference/plugin-api.md)
- [`@riebeckite/plugin-obsidian-markdown`](../obsidian-markdown/README_ja.md)
- [`@riebeckite/plugin-attachment`](../attachment/README_ja.md)

