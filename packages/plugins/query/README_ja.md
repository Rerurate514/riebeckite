# @riebeckite/plugin-query

`query` コードブロックを、コンテンツの一覧（表またはリスト）に変換するプラグインです。絞り込み・並べ替え・件数制限をフロントマターとタグに対して行い、ビルド時に HTML を生成します。クライアント側の JavaScript は不要です。

[English](./README.md)

## できること

`queryPlugin()` は Markdown 中のフェンスコードブロック

````md
```query
filter:
  tags:
    any: [diary]
sort:
  field: date
  order: desc
limit: 5
```
````

を検出し、マニフェスト（全ノートのフロントマター・タグ・パーマリンク）を使って結果を描画します。

## 設定

```ts
import { defineConfig } from "@riebeckite/core";
import { queryPlugin } from "@riebeckite/plugin-query";

export default defineConfig({
  // ...
  plugins: [queryPlugin()],
});
```

## ブロックの書き方

ブロック本文は YAML のマッピングです。すべて省略できます。

| フィールド | 型 | 内容 |
| --- | --- | --- |
| `filter` | object | 絞り込み条件（下記） |
| `sort` | object \| object[] | 並べ替え。`field`（フロントマターキー、`title`、`slug`、`permalink`）と `order`（`asc` / `desc`、既定 `asc`）。既定のフィールドは `date` |
| `limit` | number | 最大件数 |
| `offset` | number | 先頭から読み飛ばす件数 |
| `format` | `"table"` \| `"list"` | 表示形式。既定は `table` |
| `columns` | string[] | 表の列。プリセット（`title`、`date`、`updated`、`created`、`published`、`tags`、`description`、`permalink`）またはフロントマターキー |
| `excludeSelf` | boolean | このブロックを含むノート自身を結果から除く |
| `empty` | string | 一致が無いときのメッセージ |

### `filter`

| フィールド | 型 | 内容 |
| --- | --- | --- |
| `tags.any` | string[] | いずれかのタグを持つ |
| `tags.all` | string[] | すべてのタグを持つ |
| `tags.none` | string[] | どのタグも持たない |
| `folder` | string \| string[] | スラッグの前方一致 |
| `frontmatter` | object | フロントマターの一致。値が配列ならそのいずれかに一致。文字列比較は大文字小文字を区別しない |
| `date` | object | `field`（既定 `date`）と `from` / `to`（両端を含む） |

```yaml
filter:
  tags:
    any: [diary, note]
    none: [draft]
  folder: articles
  frontmatter:
    draft: false
  date:
    field: published
    from: 2024-01-01
    to: 2024-12-31
sort:
  - field: date
    order: desc
  - field: title
limit: 10
format: list
```

## オプション

| オプション | 型 | 既定値 | 内容 |
| --- | --- | --- | --- |
| `className` | `string` | `"rr-query"` | ルート要素の CSS クラス |
| `language` | `string` | `"query"` | 対象のフェンス言語 |
| `defaultFormat` | `"table"` \| `"list"` | `"table"` | ブロックが `format` を省略したときの形式 |
| `defaultColumns` | `string[]` | `["title", "date"]` | ブロックが `columns` を省略したときの列 |
| `defaultSort` | object | なし | ブロックが `sort` を省略したときの並べ替え |
| `defaultLimit` | `number` | なし | ブロックが `limit` を省略したときの上限 |
| `emptyMessage` | `string` | `"No matching content."` | 空結果のメッセージ |
| `excludeSelf` | `boolean` | `false` | 既定で自身を除外する |

## 診断

不正な YAML やマッピングでないブロックは、その場にエラー表示を出しつつ、`content-query-invalid` のエラー診断を生成します。未知のフィールドは `content-query-unknown-field` の警告になります。

## 制限事項

- クエリ結果として生成したリンクは、コンテンツグラフ（バックリンク）には含まれません。元の Markdown に書かれたリンクだけが対象です。
- 結果はビルド時に確定します。クエリ対象ノートの変更でホストノートを再生成する増分最適化は今後の課題です（フルビルドでは正しく再計算されます）。

## エクスポート

- `queryPlugin(options?)` — プラグインファクトリ
- `remarkQuery(options?)` — Remark 変換だけを利用する場合の API（`options.language` でフェンス言語を指定）
- `queryContentEntries(entries, spec)` — Core の照合エンジン（`@riebeckite/core` からも利用可能）
- 型: `QueryOptions`、`QuerySpec`、`QueryOutputFormat`

## 関連資料

- [プラグインシステム](../../../docs/ja/reference/plugin-api.md)
