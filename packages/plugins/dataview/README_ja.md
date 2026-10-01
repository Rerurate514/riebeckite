# @riebeckite/plugin-dataview

宣言的な `dataview` コードブロックをビルド時にコンテンツマニフェストへ照合し、リスト・表・タスク一覧・カレンダーとして描画するプラグインです。クライアント側の JavaScript は不要です。

[English](./README.md)

## できること

`dataviewPlugin()` は、フェンス言語が `dataview` のコードブロックを検出します。

````md
```dataview
TABLE file.name AS "Name", status
FROM #project
WHERE status = "active"
SORT file.name asc
LIMIT 10
```
````

ブロックはマニフェスト（全ノートのフロントマター・タグ・リンク・パーマリンク）を使って描画されます。DataviewJS（`dataviewjs`）には対応しません。そのブロックはコードブロックのまま残り、診断を1件出します。

## 設定

```ts
import { defineConfig } from "@riebeckite/core";
import { dataviewPlugin } from "@riebeckite/plugin-dataview";

export default defineConfig({
  // ...
  plugins: [dataviewPlugin()],
});
```

## クエリの書き方

ブロックはクエリ種別（`LIST`、`TABLE`、`TASK`、`CALENDAR`）で始まり、そのあとに任意の節が続きます。

```
LIST|TABLE|TASK|CALENDAR [式または列]
FROM <ソース式>
WHERE <真偽式>
SORT <フィールド> [asc|desc][, ...]
GROUP BY <フィールド>
LIMIT <n>
```

節のキーワードは大文字小文字を区別しません。節はそれぞれ行頭から始めますが、節の内容は複数行にまたがってもかまいません。

### `LIST`

`LIST` は一致したノートを箇条書きにします。末尾に式を書くと、リンクの横にメタ情報として表示します。

```dataview
LIST file.date
FROM #diary
SORT file.date desc
```

### `TABLE`

`TABLE` は表を描画します。列を省略すると `file.link` の1列だけになります。列はフィールドパスで、`AS` で見出しを付けられます。

```dataview
TABLE file.name AS "Name", status, priority
FROM #project
```

### `TASK`

`TASK` は一致した各ノートからタスク項目（`- [ ]` / `- [x]`）を取り出し、`<ul class="rb-dataview__tasks">` として描画します。`FROM` と `WHERE` が選ぶのは**ノート**であり、個々のタスクではありません。

```dataview
TASK
FROM #project
```

### `CALENDAR`

`CALENDAR` は月のグリッドを描画します。末尾の式で日付フィールドを指定できます（既定は `date`）。一致した日付のうち最も新しい月を表示します。

```dataview
CALENDAR date
FROM #project
```

## 節

### `FROM`

`FROM` は候補となるノートを絞り込みます。使えるソースは次の3つです。

| ソース | 意味 |
| --- | --- |
| `#tag` | そのタグを持つ |
| `"folder"` | スラッグがそのフォルダ、またはその配下 |
| `[[note]]` | `note` へリンクしている（被リンク） |

ソースは `and` / `or` でつなぎ、`!` または `-` で否定し、`(` `)` でまとめられます。ソースを続けて書いた場合は `and` とみなします。

```dataview
FROM (#project or #area) and "notes" and !#archive
```

### `WHERE`

`WHERE` は `file.*` とフロントマターのフィールドに対する真偽式でノートを絞り込みます。

| 機能 | 例 |
| --- | --- |
| 比較 | `status = "active"`、`priority > 2`、`date <= "2026-12-31"` |
| 論理 | `status = "active" and !draft`、`a or b` |
| `contains()` | `contains(file.tags, "#project")`、`contains(tags, "project")` |
| `date()` | `date(due) >= date("2026-01-01")` |
| `number()` / `string()` | `number(weight) > 3` |

文字列の `=` / `!=` と `contains()` は大文字小文字を区別しません。`date()` はミリ秒のタイムスタンプ（または `null`）を返すので、`date(a) < date(b)` は時系列で比較できます。`null` や未定義の値は `<` / `>` を満たしません。

`file.*` で使えるフィールドは `file.name`、`file.title`、`file.slug`、`file.path`、`file.folder`、`file.link`、`file.permalink`、`file.url`、`file.tags`、`file.date`、`file.created`、`file.updated`、`file.published` です。それ以外はフロントマターのキーをそのまま名前で参照します（`status`、`priority`、`due` など）。

### `SORT`

`SORT` はフィールドをカンマ区切りで並べ、各フィールドに `asc`（既定）または `desc` を付けられます。値が無いノートは末尾に並びます。

```dataview
SORT priority desc, file.name asc
```

### `GROUP BY`

`GROUP BY <フィールド>` は一致したノートをグループ化します。グループ値が見出しになり、`LIST` と `TASK` はグループごとにリストを、`TABLE` はグループ行を描画します。グループの順序は `SORT` の結果を保ちます。

### `LIMIT`

`LIMIT <n>` は描画するノート数を上限で打ち切ります（グループ化の前）。オプション `limit` を使えば全ブロックに既定の上限を設定できます。

## オプション

| オプション | 型 | 既定値 | 内容 |
| --- | --- | --- | --- |
| `className` | `string` | `"rb-dataview"` | ルート要素の CSS クラス |
| `language` | `string` | `"dataview"` | 対象のフェンス言語 |
| `hideFallback` | `boolean` | `false` | 生クエリの `<details>` フォールバックを隠す |
| `limit` | `number` | なし | ブロックが `LIMIT` を省略したときの上限 |

## 描画結果

各ブロックは次のような HTML になります。

```html
<div class="rb-dataview" data-dataview data-dataview-type="list">
  <!-- リスト・表・タスク・カレンダーのいずれか -->
  <details class="rb-dataview__fallback">
    <summary>Dataview query</summary>
    <pre><code>LIST FROM #project</code></pre>
  </details>
</div>
```

`<details>` のフォールバックには元のクエリが入ります。`hideFallback` で非表示にできます。

## 診断

- `dataviewjs` のブロックはそのまま残し、`dataview-unsupported-language` の**警告**を出します。Markdown 解析時の remark 変換でも `source: "@riebeckite/plugin-dataview"` を付けた `file.message` を記録します。
- パーサーや評価器が扱えないブロックは、その場にエラー表示を出しつつ `dataview-invalid` の**エラー**診断を生成します。対応していない構文は、Markdown 解析時にも `file.message` で報告されます。

## 制限事項

- **DataviewJS には対応しません。** `dataviewjs` は意図的に対象外です。
- **インラインフィールド（`field:: value`）には対応しません。** 参照するのはフロントマターだけです。
- **`TABLE` の列はフィールドパスです。** 任意の式は書けません。見出しの変更は `AS "Label"` だけです（`file.size / 1024` のような計算列は不可）。
- **`TASK` が絞り込むのはノートです。** `FROM` / `WHERE` はタスクを含むノートに働きます。
- **`CALENDAR` が表示するのは1か月分**です。一致した日付のうち最も新しい月を描画します。
- `file.size`、`file.mtime`、`file.ctime` はマニフェストから取得できず `undefined` になります。
- 結果はビルド時に確定します。dataview ブロックが生成したリンクはコンテンツグラフ（バックリンク）には含まれません。フルビルドでは常に正しく再計算されます。

## エクスポート

- `dataviewPlugin(options?)` / `dataview(options?)` — プラグインファクトリ
- `remarkDataview(options?)` — Remark 変換だけを利用する場合の API
- `parseDataview(source)` — ブロック本文を `DataviewSpec` に変換
- `selectDataviewEntries(spec, manifest, defaultLimit)` — 照合エンジン
- `evaluateDataviewExpression(expression, scope)` と `matchesDataviewFrom(from, entry, manifest)` — 式のヘルパー
- `renderDataview(selection, spec, options, source)` — HTML レンダラー
- `resolveDataviewOptions(options?)` — オプションの正規化
- `DATAVIEW_ATTRIBUTE` — プレースホルダーの属性名
- 型: `DataviewOptions`、`DataviewSpec`、`DataviewQueryType`、`DataviewExpression`、`DataviewFrom` ほか

## 関連資料

- [プラグインシステム](../../../docs/ja/docs/reference/plugin-api.md)

