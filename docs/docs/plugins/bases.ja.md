---
title: Bases
---
# Bases

Obsidian Bases の互換サブセットをビルド時に描画します。`bases()` は fenced
`base` ブロックと、参照された `.base` ドキュメントを扱います。クライアント側の
評価器は含みません。

[English](./bases.md)

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

行の検索とドキュメントページの検出には、Core の `publicEntries` を使います。
公開・限定公開ノートは含まれ、下書きと公開予定ノートは除外されます。非公開の
コンテンツからしか参照されない Base は公開しません。既存の Markdown ページまたは
公開リダイレクトと競合した場合はそちらを優先し、Base ページをスキップして
`bases-invalid` の警告を出します。

## 例

```yaml
filters: note.status == "published" && !file.hasTag("hidden")
formulas:
  label: 'note.author.name.upper() + " / " + note.score'
properties:
  file.name: File
  formula.label: Label
views:
  - type: table
    name: Books
    order: [file.name, formula.label]
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

対応する関数は `if`、`list`、`number`、`min`、`max`、`date`、文字列の `lower`、
`upper`、`contains`、`startsWith`、`endsWith`、`trim`、`split`、`replace`、リストの
`contains`、`join`、`unique`、`flat`、`sort`、数値の `round`、`floor`、`ceil`、`abs`、
`toFixed`、`file.hasTag`、`file.hasLink`、`file.inFolder` です。

## 互換性マトリクス

| Obsidian Base の機能 | 状態 | 備考 |
| --- | --- | --- |
| YAML ルート、`filters`、`properties`、`formulas`、`views` | 対応 | YAML または仕様が不正な場合は診断を出します。 |
| Table と cards | 対応 | ほかのビュー種別は描画しません。 |
| AST の filter と Formula | 一部対応 | 対応関数は上記のとおりです。 |
| Formula によるソート、グループ、集計 | 未対応 | Formula 値は列への表示だけに使えます。 |
| `file.name`、`file.path`、`file.ext`、`file.folder`、`file.tags`、`file.links`、`file.properties`、`file.link` | 一部対応 | Markdown マニフェストから導出します。name/path は `.md` のソース規則を使います。 |
| `file.size`、`file.mtime`、`file.ctime`、backlinks、embeds | 未対応 | Core の行にこのメタデータがありません。空の値になり、frontmatter の日付へは置き換えません。 |
| 日付・リストのラムダ／高階関数、正規表現、link/image | 未対応 | 拒否されるか、空の値として評価されます。 |

## オプションとエクスポート

`className`、`language`、`limit`、`showFallback`、`view` の意味は従来どおりです。
パッケージは `bases`、`basesPlugin`、`remarkBases`、`parseBases`、
`parseBasesExpression`、`evaluateBasesExpression`、`matchesCondition`、公開 Bases 型を
エクスポートします。
