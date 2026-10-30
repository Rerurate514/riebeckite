# @riebeckite/plugin-obsidian-markdown

<!-- Generated from docs/docs/plugins/obsidian-markdown.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

ウィキリンク、コールアウト、インラインタグ、ブロック参照など、Obsidian 独自の Markdown 記法を変換するプラグインです。

[English](./README.md)

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

- `[Note](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/Note.ja.md)`、`[別名](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/Note.ja.md)`：対象の解決済み canonical permalink へのリンクです（クラスは `rr-obsidian-wikilink`）。見出しやブロック ID のフラグメントも扱います。対象は slug で検索し、`href` には解決済みの permalink を使います
- `![Note](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/Note.ja.md)`：ノートの埋め込みです。最大 3 階層まで、循環を避けながら再帰的に描画します
- `![image.png](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/image.png.ja.md)`：`assetBase` 配下の画像になります。`[file.pdf](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/file.pdf.ja.md)` は添付ファイル用のレンダラー、またはダウンロードリンクになります
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

## 実行例

以下の記法は、このサイトで実際に描画されています。

**Callout の種類。** `note`、`tip`、`warning`、`danger`、`quote` は同じ引用構文で書けます。

> [!note] Note
> note の callout です。

> [!tip] Tip
> tip の callout です。

> [!warning] Warning
> warning の callout です。

> [!danger] Danger
> danger の callout です。

> [!quote] Quote
> quote の callout です。

**WikiLink とフラグメント。** [README](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/themes/README.ja.md) へのリンク、[プラグインカタログ](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/plugins/README.ja.md) という別名付きリンク、[plugins/showcase#Inline](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/plugins/showcase.ja.md#Inline) という見出しリンクです。

**埋め込み。** ノートと画像を埋め込みます。

![head-tag](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/glossary/head-tag.ja.md)

![riebeckite-logo-horizontal.png](https://github.com/Rerurate514/riebeckite/blob/main/docs/assets/riebeckite-logo-horizontal.png)

**タグ。** #documentation や #plugins のようなインラインタグは、タクソノミーページへのリンクになります。

**ブロック参照。** 次の段落にはブロック ID が付いています。

^live-example-block

別のノートからは `[obsidian-markdown#^live-example-block](./README_ja.md#^live-example-block)` で参照できます。

## オプション

| オプション | 既定値 | 内容 |
| --- | --- | --- |
| `assetBase` | `"/"` | 画像ウィキリンク URL の基点 |
| `callout.defaultTitles` | 組み込みの対応表 | コールアウトの既定見出し |
| `tag.tagBase` | `"/tags/"` | タグページの基点 |
| `tag.onTag` | なし | 見つけたタグごとに呼ぶ関数 |

## 公開 API

- `obsidianMarkdown(options?)` / `obsidianMarkdown`：プラグインファクトリ
- `ObsidianMarkdownOptions`、`CalloutOptions`、`TagOptions`、`WikilinkOptions`、`WikilinkFragment`：型

## 関連資料

- [プラグインシステム](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.ja.md)
- [`@riebeckite/plugin-attachment`](../attachment/README_ja.md)
