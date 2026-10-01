# Citations

Citations は、Markdown / Obsidian ノートで BibTeX / BibLaTeX の文献情報を使えるようにする Plugin です。本文中の引用を番号に変換し、ページ末尾に参考文献リストを追加します。

## 導入

```bash
npm install @riebeckite/plugin-citations
```

```ts
import { citations } from "@riebeckite/plugin-citations";

export default defineConfig({
  plugins: [citations({ bibliography: "references.bib" })],
});
```

ページごとに文献ファイルを変えたい場合は frontmatter に書けます。

```yaml
bibliography: references.bib
```

frontmatter のパスは、まずページからの相対パス、次にコンテンツルートからの相対パスとして解決します。config 側のパスは常にコンテンツルート基準です。

## 引用の書き方

Pandoc の記法を参考にした、扱いやすい範囲をサポートします。

- `[@smith2024]`
- `[@smith2024; @doe2025]`
- `@smith2024 argues that ...`
- `[-@smith2024]`（著者名を出さない形の入力）

prefix / suffix は保持されます。`[@smith2024, p. 42]` は `[1, p. 42]`、`[see @doe2025]` は `[see 2]` として表示します。同じ文献を何度も引用した場合は、最初に割り当てた番号を再利用します。

本文中の `@key` は左に境界が必要です。テキストの先頭、空白、`(` のいずれかにしてください。`本文@smith2024` のように左がつながっている場合は `[@smith2024]` を書きます。

キーに使えるのは英字、数字、`-`、`_`、`:`、`.` です。Riebeckite の directive 構文が消費してしまう `:` はプラグインが組み直すため、`[@colon:2024]` も動きます。

## 参考文献リスト

引用があるページでは、本文の末尾に `References` セクションを追加します。引用番号から、引用キーから作った安定したアンカーへ移動できます。

日本語サイトでは見出しを変えられます。

```ts
citations({ bibliography: "references.bib", referencesHeading: "参考文献" })
```

## 対応する文献種別

重点的に扱うのは `article`、`book`、`inproceedings`、`misc` です。それ以外の種別も汎用フィールドとして読み込んで表示し、diagnostics に出します。`@comment`、`@preamble`、`@string` は受け付けて読み飛ばします。

複数行フィールド、引用符と波括弧の値、ネストした波括弧、値の中のカンマ、エスケープ文字、末尾カンマ、CRLF に対応します。マクロ展開と `#` による文字列連結は対象外で、壊れたまま無視せず diagnostics に報告します。

## diagnostics

文献ファイルが見つからない、BibTeX が壊れている、引用キーが重複している、存在しない引用キーを使っている、未対応の文献種別や構文がある、といった問題を Riebeckite の diagnostics に出力します。

inline code、code block、HTML、frontmatter、通常の Markdown リンク、WikiLink の中は変換しません。

## 詳細仕様

設定項目、公開 API、制約、追加の使用例は [package README](../../../packages/plugins/citations/README_ja.md) を参照してください。Plugin 全体の仕組みは [Plugin System](../framework/plugin-system.md) を参照してください。
