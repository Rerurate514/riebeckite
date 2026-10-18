# @riebeckite/plugin-bases

<!-- Generated from docs/docs/plugins/bases.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Obsidian Bases の互換サブセットをビルド時に描画します。`bases()` は fenced
`base` ブロックと、参照された `.base` ドキュメントを扱います。クライアント側の
評価器は含みません。

[English](./README.md)

## 設定

```ts
import { bases } from "@riebeckite/plugin-bases";

export default { plugins: [bases()] };
```

## `.base` ドキュメントと公開範囲

ルーティング可能な Markdown ノートから `.base` をリンクすると、拡張子を除いた
パスに PageType ページが作られます。たとえば `![[views/Books.base]]` は
`/views/Books` を作ります。既存の PageType API を使うため、独自のルーティングは
追加しません。

ドキュメントページの検出には Core の `publicEntries` を使うため、公開または限定公開
ノートから参照した Base は明示的に公開できます。Base の行の検索には
`discoverableEntries` を使います。自動一覧には公開ノートだけが入り、限定公開ノートは
URL を直接指定した場合だけアクセスできます。下書きと公開予定ノートはいずれからも
除外します。非公開のコンテンツからしか参照されない Base は公開しません。既存の
Markdown ページまたは公開リダイレクトと競合した場合はそちらを優先し、Base ページを
スキップして `bases-invalid` の警告を出します。

## 例

```yaml
filters: note.status == "published" && !file.hasTag("hidden")
formulas:
  label: 'note.author.name.upper() + " / " + note.score'
summaries:
  total: values.reduce(acc + value, 0)
properties:
  file.name: File
  formula.label: Label
views:
  - type: table
    name: Books
    order: [file.name, formula.label]
    sort: [{ property: formula.label, direction: DESC }]
    groupBy: { property: note.status, direction: ASC }
    summaries: { formula.label: total }
  - type: cards
    name: Cards
    order: [file.name, formula.label]
```

同じ YAML を fenced `base` ブロックまたは `.base` ファイルに書けます。トップ
レベルとビューごとの `filters` は AND で結合します。Table と cards はビルド時に
描画し、HTML に出す動的な値はすべてエスケープします。

## 式と Formula のサブセット

式は AST に構文解析して直接評価します。`eval`、`Function`、任意の JavaScript 実行は
使いません。リテラル、配列、ネストしたメンバー・インデックス参照、`!`、単項 `-`、
算術、比較、`&&`、`||`、括弧、プロパティ同士の比較、`formula.name` 参照に対応します。
Formula の循環参照は空の値になります。

対応する関数は `if`、`list`、`length`、`number`、`min`、`max`、`date`、文字列の `lower`、
`upper`、`contains`、`startsWith`、`endsWith`、`trim`、`split`、`replace`、リストの
`contains`、`containsAll`、`containsAny`、`join`、`unique`、`flat`、`sort`、`reverse`、
`slice`、`isEmpty`、`map`、`filter`、`reduce`、数値の `round`、`floor`、`ceil`、`abs`、
`toFixed`、`file.hasTag`、`file.hasLink`、`file.inFolder` です。

## 互換性マトリクス

| Obsidian Base の機能 | 状態 | 備考 |
| --- | --- | --- |
| YAML ルート、`filters`、`properties`、`formulas`、`summaries`、`views` | 対応 | YAML または仕様が不正な場合は診断を出します。 |
| Table と cards | 対応 | ほかのビュー種別は描画しません。 |
| AST の filter と Formula | 一部対応 | 対応関数は上記のとおりです。 |
| Formula によるソートと複数の安定ソートキー | 対応 | 空の値は末尾に並びます。 |
| `groupBy` と `groupOrder` | 対応 | Formula プロパティ、空グループ、Table、cards に対応します。対話的な折りたたみは対象外です。 |
| Table の集計 | 一部対応 | 名前付き集計、Empty、Filled、Unique、Checked、Unchecked、数値、日付の集計を使えます。 |
| Cards の集計 | 対象外 | Obsidian は集計を cards ではなく Table に表示します。 |
| `file.name`、`file.path`、`file.ext`、`file.folder`、`file.tags`、`file.links`、`file.properties`、`file.link` | 一部対応 | Markdown マニフェストから導出します。name/path は `.md` のソース規則を使います。 |
| `file.size`、`file.mtime`、`file.ctime`、backlinks、embeds | 未対応 | Core の行にこのメタデータがありません。空の値になり、frontmatter の日付へは置き換えません。 |
| リストの `map`、`filter`、`reduce` | 一部対応 | `value`、`index`、`acc` スコープの式を使い、リスト長には上限があります。 |
| 正規表現、オブジェクトリテラル、link/image の描画、非決定的な date/random 関数 | 未対応 | JavaScript を実行せず、安全でない URL を出力しません。 |
| 編集、グループの折りたたみなどの対話的なビュー操作 | 対象外 | Riebeckite は静的なビルド出力を描画します。 |

## オプションとエクスポート

`className`、`language`、`limit`、`showFallback`、`view` の意味は従来どおりです。
パッケージは `bases`、`basesPlugin`、`remarkBases`、`parseBases`、
`parseBasesExpression`、`evaluateBasesExpression`、`matchesCondition`、公開 Bases 型を
エクスポートします。
