# @riebeckite/plugin-bases

<!-- Generated from docs/docs/plugins/bases.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Obsidian Bases の互換サブセットをビルド時に描画します。`bases()` はフェンス付き
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
パスに PageType ページが作られます。たとえば `![views/Books.base](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/views/Books.base.ja.md)` は
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

同じ YAML をフェンス付き `base` ブロックまたは `.base` ファイルに書けます。トップ
レベルとビューごとの `filters` は AND で結合します。表とカードはビルド時に
描画し、HTML に出す動的な値はすべてエスケープします。

## 公式構文への対応

Obsidian の [Bases 構文](https://help.obsidian.md/bases/syntax) と
[ビュー](https://help.obsidian.md/bases/views) の YAML 形式を確認し、決定的な静的出力に
範囲を限定して対応状況を整理しています。

| 構文またはビュー機能 | 状態 | 静的出力での扱い |
| --- | --- | --- |
| ルートの `filters`、`formulas`、`properties`、`summaries`、`views` | 対応 | 再帰的な `and`／`or`／`not` フィルタと `displayName` を受け付けます。 |
| ビューの `type`、`name`、`limit`、`filters`、`order`、`sort`、`groupBy`、`groupOrder`、`summaries` | 対応 | `groupOrder` は排他的です。空リストはすべてのグループを隠し、存在しない値を列挙すると空グループを作ります。 |
| 表とカードのレイアウト | 対応 | 実行時の評価器を持たないセマンティック HTML を生成します。 |
| list、kanban、map のレイアウト | 未対応 | 対話的・空間的な動作はこの静的レンダラーでは表現できません。 |
| 編集、プロパティメニュー、列幅変更、ドラッグ＆ドロップ、折りたたみ操作 | 対象外 | Bases はサイトのビルド時に描画します。 |

## 式と Formula の対応範囲

式は AST に構文解析して直接評価します。`eval`、`Function`、任意の JavaScript 実行は
使いません。リテラル、配列、ネストしたメンバー・インデックス参照、`!`、単項 `-`、
算術、比較、`&&`、`||`、括弧、プロパティ同士の比較、`formula.name` 参照に対応します。
Formula の循環参照は空の値になります。

対応する関数は `if`、`list`、`length`、`number`、`min`、`max`、`date`、`duration`、
`isTruthy`、`isType`、`toString`、`escapeHTML`、文字列の `lower`、`upper`、`title`、
`contains`、`startsWith`、`endsWith`、`trim`、`split`、`replace`、`reverse`、`repeat`、
`slice`、`isEmpty`、リストの `contains`、`containsAll`、`containsAny`、`join`、`unique`、
`flat`、`sort`、`reverse`、`slice`、`isEmpty`、`mean`、`sum`、`min`、`max`、`map`、
`filter`、`reduce`、数値の `round`、`floor`、`ceil`、`abs`、`toFixed`、オブジェクトの
`isEmpty`、`keys`、`values`、UTC の日付フィールド、`date`、`time`、`format`、
`file.hasTag`、`file.hasLink`、`file.inFolder`、`file.hasProperty` です。

`date()` は UTC の ISO タイムスタンプ、`YYYY-MM-DD`、有限の epoch ミリ秒値、または
既存の Date だけを受け付けます。日付フィールドとフォーマットは UTC を使うため、静的
ビルドでホストのロケールや曖昧な日付構文に依存しません。

Formula の評価は、1 回につき AST の 10,000 ステップとネストした式の 128 段階までです。
いずれかを超えると決定的に停止し、`bases-invalid` 診断を出して Base のエラー表示に
切り替えます。大きな高階の式や深い式で静的ビルドの処理が無制限に続くことを防ぎ、
JavaScript のコールバックは実行しません。

## ファイルメタデータ

`file.size` はソースファイルのバイト数です。`file.mtime` と `file.ctime` は
ファイルシステムから得る UTC の `Date` 値で、プロパティ、フィルタ、Formula、ソート、
グループ、集計、高階の式で使えます。ソースのメタデータが欠落または不正な場合は、描画後の
Markdown やビルド時刻から補わず、空の値として扱います。日付どうしの減算はミリ秒になり、
`"7 days"` のような duration による Date の加減算もできます。

ファイルシステムのコンテンツでは、`file.ctime` に Node の `birthtime` を使います。
状態変更時刻である `stat.ctime` は使いません。Windows では通常、作成時刻を取得
できます。Linux のファイルシステムは作成時刻を持たないことがあり、Node が
ファイルシステム依存の代替値を返すか、利用できる値がない場合があります。移植性が必要な
Base では空の `file.ctime` を扱ってください。キャッシュした時刻は UTC の瞬間を保ちます。

## 増分ビルド

Bases は、フィルタ、Formula、列、ソート、グループ、集計が読むプロパティを永続 Output
Inventory に記録します。これはフェンス付き Base と参照された各 `.base` ドキュメントに個別に適用されます。
これらのプロパティ、参照するファイルメタデータ、または公開候補集合が変わった場合だけ、その値を読む Base 出力を
再生成します。フィルタに一致しない状態から一致する状態への変更も検出します。本文だけの編集と無関係な frontmatter 編集では Base 出力を
再利用します。

Formula の循環、動的なプロパティ参照など、静的に証明できない依存関係では Base 単位で保守的に再生成します。
不明な依存関係を依存なしとして扱うことはありません。下書き、スケジュール公開、unlisted のエントリは Base の行から除外され、
キャッシュ出力からも公開されません。

## 静的ビューのアクセシビリティ

表は列と行グループの見出しを維持し、画面読み上げ用の件数を持ちます。狭い画面では
キーボードでフォーカスできる横スクロール領域に収めます。グループ名には行数を示し、
`groupOrder` にあるが一致する行がない値は空グループとして明示します。カードのグループは
ラベル付きリストとし、集計値には画面読み上げ用の列名を加えます。いずれも JavaScript を
使わない静的出力のままです。

## 互換性マトリクス

| Obsidian Base の機能 | 状態 | 備考 |
| --- | --- | --- |
| YAML ルート、`filters`、`properties`、`formulas`、`summaries`、`views` | 対応 | YAML または仕様が不正な場合は診断を出します。 |
| 表とカード | 対応 | ほかのビュー種別は描画しません。 |
| AST のフィルタと Formula | 一部対応 | 対応関数は上記のとおりです。 |
| Formula によるソートと複数の安定ソートキー | 対応 | 空の値は末尾に並びます。 |
| `groupBy` と `groupOrder` | 対応 | Formula プロパティ、順序付きの空グループ、表、カードに対応します。対話的な折りたたみは対象外です。 |
| 表の集計 | 一部対応 | 名前付き集計、Empty、Filled、Unique、Checked、Unchecked、数値、日付の集計を使えます。 |
| カードの集計 | 対象外 | Obsidian は集計をカードではなく表に表示します。 |
| `file.name`、`file.path`、`file.ext`、`file.folder`、`file.tags`、`file.links`、`file.properties`、`file.link` | 一部対応 | Markdown マニフェストから導出します。name/path は `.md` のソース規則を使います。 |
| `file.size`、`file.mtime`、`file.ctime` | 対応 | バイト数、ファイルシステムの更新時刻、作成時刻相当を使います。Linux では `ctime` が利用できないことがあります。`stat.ctime`、frontmatter、ビルド時刻へは置き換えません。 |
| Backlinks、埋め込み | 未対応 | これらの値は空になります。 |
| リストの `map`、`filter`、`reduce` | 一部対応 | `value`、`index`、`acc` スコープの式を使い、リスト長には上限があります。 |
| 決定的なユーティリティ、オブジェクト、日付、ファイルプロパティの関数 | 一部対応 | UTC 日付、`duration`、コレクション／オブジェクトのヘルパー、`file.hasProperty` を使えます。Vault API や描画済みリンクを必要とする関数は使えません。 |
| 増分依存追跡 | 対応 | フィルタ候補集合と AST から得たプロパティ依存を追跡し、動的・循環 Formula は Base 単位でフォールバックします。 |
| 正規表現、オブジェクトリテラル、`file()`、リンク・画像・アイコン・HTML の描画、`now`、`today`、`random`、相対日付 | 未対応 | JavaScript を実行せず、ビルド時刻に依存せず、安全でない URL を出力しません。 |
| 編集、グループの折りたたみなどの対話的なビュー操作 | 対象外 | Riebeckite は静的なビルド出力を描画します。 |

## オプションとエクスポート

`className`、`language`、`limit`、`showFallback`、`view` の意味は従来どおりです。
パッケージは `bases`、`basesPlugin`、`remarkBases`、`parseBases`、
`parseBasesExpression`、`analyzeBasesDependencies`、`evaluateBasesExpression`、`matchesCondition`、公開 Bases 型を
エクスポートします。
