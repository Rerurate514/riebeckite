# @riebeckite/plugin-obsidian-markdown

<!-- Generated from docs/docs/plugins/obsidian-markdown.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

ウィキリンク、コールアウト、インラインタグ、ブロック参照など、Obsidian 独自の Markdown 記法を変換するプラグインです。

[English](./README.md)

## インストール

```sh
npm install @riebeckite/plugin-obsidian-markdown
```

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

- `[Note](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/Note.ja.md)`、`[別名](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/Note.ja.md)`、`[folder/Note](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/folder/Note.ja.md)`：対象の解決済み canonical permalink へのリンクです（クラスは `rr-obsidian-wikilink`）。対象はコンテンツインデックスで検索し、`href` には解決済みの permalink を使います
- 同一ページのフラグメント `[#見出し](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/.ja.md#見出し)`、`[#^block-id](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/.ja.md#^block-id)` は現在のノート内へのリンクです。ノート参照とは別の経路で解決し、現在のノートの permalink を保ちます
- ノートをまたぐフラグメント `[Note#見出し](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/Note.ja.md#見出し)`、`[Note#^block-id](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/Note.ja.md#^block-id)`、`[別名](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/Note.ja.md#見出し)` に対応します。別名がない場合のリンク文字列は Obsidian と同じく `Note > 見出し` になります
- `![Note](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/Note.ja.md)`：ノートの埋め込みです。最大 3 階層まで、循環を避けながら再帰的に描画します
- `![Note#見出し](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/Note.ja.md#見出し)`、`![Note#^block-id](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/Note.ja.md#^block-id)`：見出し配下またはブロックだけを埋め込みます。見出しは同じか上位の次の見出しまで、ブロックは Obsidian と同じ境界規則（単独行のマーカーは直前のブロック、リスト項目直後のマーカーはその項目）で切り出します。`![#見出し](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/.ja.md#見出し)` は現在のノートの一部を埋め込みます
- `![image.png](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/image.png.ja.md)`：`assetBase` 配下の画像になります。`![300](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/image.png.ja.md)` と `![300x200](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/image.png.ja.md)` は幅・高さに、`![説明](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/image.png.ja.md)` は代替テキストになります。寸法は正の整数だけを受け付けます
- `[file.pdf](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/file.pdf.ja.md)` は添付ファイル用のレンダラー、またはダウンロードリンクになります
- `> [!note]`：コールアウトです。`+` と `-` で折りたたみ状態を指定できます
- `#tag`、`#nested/tag`：タグページへのリンクになります
- 段落末尾の `^block-id`：要素の `id` と `data-block-id` になります

解決できないウィキリンクは `rr-obsidian-wikilink--broken` クラスを付けたリンクになります。添付カードやメディア表示が必要なら、別途対応する添付プラグインを登録してください。

ノート・画像・未解決の埋め込みには、プラグインが既定の CSS を提供します。ノート埋め込みには、生成コンテンツではなく実際の DOM テキストとして `Embedded: <slug>` を表示し、支援技術からもラベルを読めるようにします。

### コメント

`%% コメント %%` は出力から削除されます。複数行にまたがるコメントにも対応します。Obsidian と同じく、インラインコードとフェンスコードブロック内のコメントはそのまま残します。

### ブロック参照

`id` は HTML のサニタイズ後に付与するため、アンカーは `#block-id` のまま解決できます。同じ文書内で ID が重複した場合は連番の接尾辞を付けます。

`+` または `-` を付けたコールアウトは `details.rr-callout.rr-callout--collapsible` と `summary.rr-callout__title` で出力します。`+` は `open` 属性を付け、`-` は閉じた状態で開始します。開閉は `details` 要素の標準動作なので、クライアントスクリプトは追加しません。

テーマは `rr-callout` のルート要素に `--rr-callout-title-color`、
`--rr-callout-title-font-family`、`--rr-callout-title-font-size`、
`--rr-callout-title-font-weight`、`--rr-callout-title-letter-spacing`、
`--rr-callout-title-text-transform`、`--rr-callout-icon-color` を指定して見た目を
調整できます。コールアウトの子要素は選択しないでください。

## 互換性

| 機能 | Obsidian | Riebeckite | 補足 |
| --- | --- | --- | --- |
| `[Note](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/Note.ja.md)`、`[別名](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/Note.ja.md)` | 対応 | 完全 | |
| `[folder/Note](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/folder/Note.ja.md)` | 対応 | 完全 | コンテンツインデックスで解決 |
| `[Note#見出し](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/Note.ja.md#見出し)` | 対応 | 完全 | |
| `[Note#^block-id](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/Note.ja.md#^block-id)` | 対応 | 完全 | |
| `[#見出し](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/.ja.md#見出し)`、`[#^block-id](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/.ja.md#^block-id)` | 対応 | 完全 | 同一ノートへのリンク |
| リンク文字列 `Note > 見出し` | 対応 | 完全 | 別名が優先 |
| `![image.png](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/image.png.ja.md)` | 対応 | 完全 | |
| `![300](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/image.png.ja.md)`、`\|300x200` | 対応 | 完全 | 正の整数のみ |
| `![説明](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/image.png.ja.md)` | 対応 | 完全 | 代替テキスト |
| `![Note](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/Note.ja.md)` | 対応 | 完全 | |
| `![Note#見出し](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/Note.ja.md#見出し)` | 対応 | 完全 | 同じか上位の次の見出しまで |
| `![Note#^block-id](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/Note.ja.md#^block-id)` | 対応 | 完全 | |
| `![#見出し](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/.ja.md#見出し)` | 対応 | 完全 | 同一ノートの埋め込み |
| `%% コメント %%` | 対応 | 完全 | 複数行対応、コード内は保持 |
| コールアウト | 対応 | 完全 | |
| 折りたたみコールアウト | 対応 | 完全 | `details` / `summary` の標準動作。クライアントスクリプトなし |
| ネストしたコールアウト | 対応 | 完全 | |
| コールアウトのアイコン | 対応 | 一部 | 種類ごとの色付けのみで、Obsidian のアイコン群とは異なる |
| 埋め込みの深さ | 対応 | 一部 | 3 階層まで |

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

**WikiLink とフラグメント。** [README](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/themes/README.ja.md) へのリンク、[プラグインカタログ](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/plugins/README.ja.md) という別名付きリンク、[plugins/showcase/inline#インライン表現](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/plugins/showcase/inline.ja.md#インライン表現) という見出しリンクです。

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
