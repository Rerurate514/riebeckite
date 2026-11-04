# @riebeckite/plugin-dataview

<!-- Generated from docs/docs/plugins/dataview.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

`dataview` コードブロックをビルド時に Content Manifest と照合し、リスト・表・タスク一覧・カレンダーとして描画します。クライアント側 JavaScript は不要です。

[English](./README.md)

## 概要

`dataview()` は言語が `dataview` のフェンスブロックを認識します。

````md
```dataview
TABLE file.name AS "Name", status
FROM #project
WHERE status = "active"
SORT file.name asc
LIMIT 10
```
````

描画には公開マニフェストと各ノートの Markdown 原文を使います。frontmatter、インラインフィールド、タスク、タグ、リンク、ファイルメタデータ、パーマリンクが対象です。`unlisted`・`draft`・`scheduled` のノートは照合から除外され、そのインラインフィールドやタスクも読み込まれません。DataviewJS（`dataviewjs`）には対応しません。そのブロックはコードブロックのまま残り、診断を 1 件出します。

## 設定

```ts
import { defineConfig } from "@riebeckite/core";
import { dataview } from "@riebeckite/plugin-dataview";

export default defineConfig({
  // ...
  plugins: [dataview()],
});
```

## クエリ構文

ブロックはクエリ種別（`LIST`・`TABLE`・`TASK`・`CALENDAR`）と節からなります。

```
LIST|TABLE|TASK|CALENDAR [式または列]
FROM <ソース式>
WHERE <真偽式>
FLATTEN <式> [AS 名前]
SORT <式> [asc|desc][, ...]
GROUP BY <式> [AS 名前]
LIMIT <n>
```

節は大文字小文字を区別せず、それぞれ行頭から始まります。節の本文は複数行にまたがってもかまいません。コマンドは**書かれた順**に実行され、同じコマンドを複数回書けます。

```
LIMIT 5
SORT priority desc
```

### `LIST`

`LIST` は一致したノートの箇条書きを描画します。末尾の式はリンクの横にメタデータとして表示されます。

```dataview
LIST file.date
FROM #diary
SORT file.date desc
```

### `TABLE`

`TABLE` は表を描画します。`WITHOUT ID` を付けない限り、先頭列はファイルリンクです。以降の列は式で、`AS` で見出しを付けられます。

```dataview
TABLE WITHOUT ID file.name AS "Name", status, priority * 2 AS "Score"
FROM #project
```

### `TASK`

`TASK` はノート単位ではなくタスク（`- [ ]` / `- [x]`）単位で 1 行を描画します。`FROM` がノートを選び、`WHERE`・`FLATTEN`・`SORT`・`GROUP BY` は**個々のタスク**に対して実行されます。

```dataview
TASK
FROM #project
WHERE !completed and due >= date("2026-01-01")
SORT line asc
```

### `CALENDAR`

`CALENDAR` は月のグリッドを描画します。末尾の式で日付の式を指定できます（既定は `date`）。一致した日付のうち最も新しい月を表示します。

```dataview
CALENDAR date
FROM #project
```

## クエリの節

### `FROM`

`FROM` は候補ノートを絞り込みます。使えるソースは次のとおりです。

| ソース | 意味 |
| --- | --- |
| `#tag` | そのタグ、またはそのサブタグを持つ |
| `"folder"` | slug がそのフォルダ、またはその配下 |
| `"notes/note.md"` | そのパスのノート |
| `[note](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/note.ja.md)` | `note` へリンクしている（被リンク） |

ソースは `and` / `or` でつなぎ、`!` または `-` で否定し、`(` `)` でまとめられます。ソースを続けて書いた場合は `and` とみなします。

```text
FROM (#project or #area) and "notes" and !#archive
```

### `WHERE`

`WHERE` は行のフィールドを使った真偽式で絞り込みます。

| 機能 | 例 |
| --- | --- |
| 比較 | `status = "active"`、`priority > 2`、`due <= date("2026-12-31")` |
| 真偽 | `status = "active" and !draft`、`a or b`、`&&` / `\|\|` |
| 算術 | `priority * 2 > 4`、`(a + b) / 2` |
| リストリテラル | `contains(["a", "b"], status)` |
| 文字列 | `startswith(file.name, "2026")`、`lower(status) = "done"` |
| `contains()` | `contains(file.tags, "#project")`、`contains(tags, "project")` |
| `date()` / `dateformat()` | `date(due) >= date("2026-01-01")` |
| 集計 | `length(tags) > 1`、`min(priority)`、`sum(points)` |

文字列の `=`/`!=` と `contains()` は大文字小文字を区別しません。`+` は数値の加算、または文字列の連結です。0 除算や未対応の演算は `null` になります。`null` や欠損値は `<`/`>` の比較を満たしません。

対応する関数は `contains`、`date`、`dateformat`、`number`、`string`、`length`、`lower`、`upper`、`trim`、`round`、`floor`、`ceil`、`min`、`max`、`sum`、`average`、`startswith`、`endswith`、`join`、`reverse`、`sort`、`default`、`nonnull`、`choice` です。未知の関数はエラーブロックを描画し、診断を 1 件出します。

### `FLATTEN`

`FLATTEN` は配列の式を 1 要素 1 行に展開します。`AS` で付けた別名は後続のコマンドや列から参照できます。

```dataview
TABLE WITHOUT ID author
FROM #literature
FLATTEN authors AS author
SORT author asc
```

### `SORT`

`SORT` は式のカンマ区切りと、任意の方向（既定は `asc`、ほかに `desc`）を受け取ります。欠損値の行は末尾に並びます。

```text
SORT priority desc, file.name asc
```

### `GROUP BY`

`GROUP BY <式> [AS 名前]` は行をグループ化します。各グループはグループ値の見出しで始まり、`LIST` と `TASK` はグループごとに 1 つのリストを、`TABLE` はグループ行を描画します。グループの順序は直前までのコマンドの結果を引き継ぎます。

### `LIMIT`

`LIMIT <n>` はその位置までの行数を制限します。`limit` オプションでも指定でき、`LIMIT` のないブロックに適用されます。

## インラインフィールド

Dataview のインラインフィールドは各ノートの Markdown 原文から読み取るため、Vault を書き換える必要はありません。

```md
status:: active
priority:: 3
due:: 2026-11-10
```

角括弧のフィールドは、その文・リスト項目・タスクにメタデータを付けます。

```md
I would rate this a [rating:: 9]!
- [ ] Send the invoice [due:: 2026-11-10].
```

値は YAML に近い規則で型付けされます。`true`/`false` は真偽値、数値は数値、`YYYY-MM-DD` は日付、`[a, b]` はリスト、引用符で囲んだ値は文字列です。同名のフィールドは frontmatter よりインラインが優先され、同じ名前のインラインフィールドが複数あれば後のものが優先されます。フィールド名は正規化した形（小文字、空白を `-`）でも参照できます。

## タスクのフィールド

タスク行では Dataview の暗黙フィールド `status`、`checked`、`completed`、`fullyCompleted`、`text`、`visual`、`line`、`lineCount`、`path`、`section`、`tags`、`outlinks`、`children`、`link`、`task`、`annotated`、`parent`、`blockId` を参照できます。タスクはページのフィールドを継承し、角括弧のインラインフィールドを追加できます。

Tasks プラグインの日付ショートハンド（`🗓️`、`✅`、`➕`、`🛫`、`⏳`）は `due`、`completion`、`created`、`start`、`scheduled` として読み取ります。優先度と繰り返しは未対応です。

## フィールド

`file.*` フィールドは `file.name`（ファイル名）、`file.title`、`file.slug`、`file.path`、`file.folder`、`file.link`、`file.permalink`、`file.url`、`file.tags`、`file.etags`、`file.inlinks`、`file.outlinks`、`file.size`、`file.ctime`、`file.mtime`、`file.date`、`file.created`、`file.updated`、`file.published` です。frontmatter のキーは名前をそのまま指定して読めます（`status`、`priority`、`due` など）。

## 静的ビルド時刻

`today` と `now` はビルド時刻を使います。1 回のビルドで時刻を 1 度だけ解決するため、同じビルド内のすべてのブロックで一致します。`today` はビルド時刻の UTC 0 時です。再現性のある出力が必要な場合は `ContentManager` に `publishingBuildTime` を渡してください。

```ts
new ContentManager(source, [], {
  config,
  plugins: [dataview()],
  publishingBuildTime: "2026-11-01T00:00:00.000Z",
});
```

結果はビルド時に固定されます。Dataview ブロックが生成したリンクはコンテンツグラフ（被リンク）には追加されません。

## オプション

| オプション | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `className` | `string` | `"rb-dataview"` | ルートの CSS クラス |
| `language` | `string` | `"dataview"` | 対象とするフェンス言語 |
| `hideFallback` | `boolean` | `false` | 生クエリの `<details>` を隠す |
| `limit` | `number` | なし | `LIMIT` のないブロックに使う既定値 |
| `localeMode` | `"current" \| "fallback" \| "all"` | `"current"` | クエリ行に含める言語の選択 |

## 描画

各ブロックは次の形になります。

```html
<div class="rb-dataview" data-dataview data-dataview-type="list">
  <!-- リスト・表・タスク・カレンダー -->
  <details class="rb-dataview__fallback">
    <summary>Dataview query</summary>
    <pre><code>LIST FROM #project</code></pre>
  </details>
</div>
```

読みやすい `<details>` には元のクエリが入り、`hideFallback` で無効にできます。

## 診断

- `dataviewjs` ブロックはそのまま残し、`dataview-unsupported-language` の**警告**を出します。Markdown 変換時にも `source: "@riebeckite/plugin-dataview"` の `file.message` を記録します。
- パーサーや評価器が扱えないブロックはエラーボックスを描画し、`dataview-invalid` の**エラー**診断を出します。未対応の構文は Markdown 解析時にも `file.message` として報告されます。

## 互換性

| 機能 | Obsidian の対応 | Riebeckite の対応 | 備考 |
| --- | --- | --- | --- |
| `LIST`・`TABLE`・`TASK`・`CALENDAR` | 対応 | 完全 | |
| `FROM`（タグ・フォルダ・リンク） | 対応 | 完全 | タグはサブタグを含む |
| `FROM`（ファイルパス） | 対応 | 完全 | |
| `WHERE` の真偽・比較 | 対応 | 完全 | |
| 算術とリストリテラル | 対応 | 完全 | |
| 主要な関数 | 対応 | 一部 | 数値・文字列・リスト・日付の主要関数。ラムダは未対応 |
| インラインフィールド | 対応 | 完全 | `Key:: value`、`[Key:: value]`、`(Key:: value)` |
| frontmatter のフィールド | 対応 | 完全 | |
| `TASK` のタスク単位の絞り込み | 対応 | 完全 | |
| `TASK` のフィールドショートハンド | 対応 | 一部 | 日付のみ。優先度と繰り返しは未対応 |
| `FLATTEN` | 対応 | 完全 | |
| `WITHOUT ID` | 対応 | 完全 | |
| コマンドの順序と重複 | 対応 | 完全 | |
| `SORT` / `GROUP BY` の式 | 対応 | 完全 | |
| `rows` のフィールド展開 | 対応 | 未対応 | 式からは参照できない |
| DataviewJS | 対応 | 未対応 | 意図的に対象外 |
| インラインフィールドの表示 | 値を表示 | 異なる | Riebeckite は原文のテキストを Markdown として残す |
| `file.tasks` などの暗黙リスト | 対応 | 一部 | `file.tasks`・`file.lists` などは未設定 |

## エクスポート

- `dataview(options?)` — プラグインファクトリ
- `remarkDataview(options?)` — 単体で使える remark 変換
- `parseDataview(source)` — ブロック本文を `DataviewSpec` に変換
- `parseExpression(source)` — DQL の式を単体で解析
- `parseInlineFields(markdown)` / `parseInlineFieldText(text)` — インラインフィールド
- `parseDataviewTasks(markdown)` — タスクの抽出
- `selectDataviewEntries(spec, manifest, defaultLimit, options?)` — 照合エンジン
- `evaluateDataviewExpression(expression, scope)` と
  `matchesDataviewFrom(from, entry, manifest)` — 式の補助関数
- `renderDataview(selection, spec, options, source, context?)` — HTML 描画
- `resolveDataviewOptions(options?)` — プラグインオプションの正規化
- `DATAVIEW_ATTRIBUTE` — プレースホルダー属性名
- 型: `DataviewOptions`、`DataviewSpec`、`DataviewQueryType`、
  `DataviewExpression`、`DataviewFrom`、`DataviewRow`、`DataviewTask` など

## 関連項目

- [プラグインガイド](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.md)
- [Obsidian Dataview のドキュメント](https://blacksmithgu.github.io/obsidian-dataview/)
