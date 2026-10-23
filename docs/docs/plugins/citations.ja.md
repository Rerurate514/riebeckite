---
date: 2026-10-08
title: Citations
---
# Citations

[English](./citations.md)

Markdown / Obsidian ノートで BibTeX / BibLaTeX の文献情報を使って引用を表示する、Riebeckite 公式プラグインです。

```ts
import { citations } from "@riebeckite/plugin-citations";

export default {
  plugins: [
    citations({ bibliography: "references.bib" }),
  ],
};
```

## 対応する引用の記法

Pandoc を参考にした、安定した記法のサブセットを扱います。

- `[@smith2024]`
- `[@smith2024; @doe2025]`：複数のキーは `;` で区切る
- `@smith2024 argues that ...`
- `[-@smith2024]`：著者名を出さない形の入力
- `[@smith2024, p. 42]` と `[see @doe2025]`：接頭辞と接尾辞を保持し、`[1, p. 42]` と `[see 2]` として表示する

同じ文献を何度も引用した場合は、最初に割り当てた番号を再利用します。番号形式の表示では `[-@smith2024]` と `[@smith2024]` のラベルは同じになります。

本文中の `@key` は、テキストの先頭、空白、`(` のいずれかの直後に書きます。`本文@smith2024` のように `@key` の左が文字でつながっている形は認識されないため、`[@smith2024]` を使ってください。

Riebeckite はこのプラグインより先に `:name` をディレクティブとして解釈します。ディレクティブ化で引用キーが分断された場合はプラグインが組み直すため、`[@colon:2024]` と `@colon:2024 argues` の両方が動きます。キーに使えるのは英字、数字、`-`、`_`、`:`、`.` です。

変換しない対象: インラインコード、フェンス付きコードブロック、HTML、frontmatter、任意の階層にある通常の Markdown リンク、Obsidian の Wikilink。

## 文献ファイルの読み込み

- `citations({ bibliography })` のパスはコンテンツルートからの相対パスです。
- frontmatter の `bibliography` は、まずページからの相対パス、次にコンテンツルートからの相対パスとして解決します。`/` と `\` の両区切りを受け付け、`../` は文字列内で正規化します。候補はいずれもコンテンツソースを通るため、設定されたコンテンツルートの外は読み込めません。
- 文献ファイルはビルド時に読み込むだけで、出力にはコピーされず、絶対パスも生成物に現れません。

## 対応する BibTeX の範囲

重点的に扱う文献種別は `article`、`book`、`inproceedings`、`misc` です。その他の種別も汎用フィールドとして読み込んで表示し、`citation-unsupported-entry-type` として報告します。

`@comment`、`@preamble`、`@string` は受け付けて読み飛ばします。壊れたエントリは `citation-malformed-bibliography` を出し、次の `@` から再開するため、1 件の不正でファイルの残りが消えることはありません。

対応する構文: 複数行フィールド、引用符と波括弧の値、ネストした波括弧、値の中のカンマ、エスケープ文字、末尾カンマ、空白、CRLF。

次の構文は黙って無視せず、`citation-unsupported-bibliography-syntax` として報告します。

- `@string` のマクロ参照は展開せずそのまま文字列として表示する
- `#` による文字列連結は先頭の部分しか保持しない

## 参考文献リスト

引用があるページでは、Markdown 本文の末尾に `References` 見出しと番号付きリストを追加します。各項目には `ref-<正規化したキー>` 形式の `id` を付与します。`[A-Za-z0-9_-]` 以外の文字は `-` に置き換え、衝突した場合は決定的な連番を付けます。引用ラベルはこのアンカーへリンクします。

日本語サイトでは見出しを変えられます。

```ts
citations({ bibliography: "references.bib", referencesHeading: "参考文献" })
```

## 参考文献ページ

`pagePath` を設定すると、参考文献の一覧ページを生成します。既定では無効で、指定しないかぎり生成しません。

```ts
citations({ bibliography: "references.bib", pagePath: "/bibliography" })
```

ページタイプ（`citations-bibliography`）は、次の 2 か所から文献を集めます。

- プラグインの `bibliography` オプション（コンテンツルートからの相対パス）
- 公開（discoverable）ページの frontmatter `bibliography`

frontmatter の `bibliography` を取り込むのは `manifest.discoverableEntries` だけです。下書き、unlisted、公開予定など、公開対象でないページは無視するため、それらの文献がページへ漏れることはありません。

各ファイルの文献は決定的な順序で統合します。内容まで同じ重複は黙って 1 件にまとめ、同じキーで内容が異なる場合は先に見つかった定義を採用し、`citation-duplicate-key` として報告します。ファイルが見つからない場合は `citation-missing-bibliography`、解析できない場合は `citation-malformed-bibliography` を報告します。文献が 1 件も集まらないときはページを生成しません。同じパスを Markdown ページやリダイレクトが既に持っている場合は Markdown を優先し、`citations-page-conflict` を報告してページを生成しません。

ページ本文には専用の `<main>` と `<h1>` を持たせ、文献エントリのテキストはすべてエスケープします。`url` と `doi` は安全な `http(s)` のときだけリンクにします。文献はキー順に並べます。既存の本文中の引用と `References` セクションは変更しません。

参考文献ページはグローバルな出力依存（`global`）を宣言します。文献ファイル、frontmatter の `bibliography`、ページの公開状態、`pagePath` の変更で、影響する出力を無効化します。

## オプション

| 項目 | 既定値 | 説明 |
| --- | --- | --- |
| `bibliography` | 未設定 | コンテンツルートからの相対パスで指定する BibTeX / BibLaTeX ファイル |
| `referencesHeading` | `"References"` | 生成する参考文献の見出し |
| `pagePath` | 未設定 | 参考文献一覧ページのパス。指定しないときは生成しない |

## 診断

以下を Riebeckite の診断として出力します。

- `citation-unknown-key`
- `citation-missing-bibliography`
- `citation-malformed-bibliography`
- `citation-duplicate-key`
- `citation-unsupported-entry-type`
- `citation-unsupported-bibliography-syntax`

引用番号、参考文献の並び、生成される HTML、診断の順序は決定的で、同じ入力からは同じ出力になります。

## ライセンス

Apache-2.0
