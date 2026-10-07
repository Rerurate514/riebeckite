# @riebeckite/plugin-bases

フェンスコードブロック `base` に書いた Obsidian Bases 定義を HTML にレンダリングします。フィルタ・ソート・ビューの組み立てはビルド時にコンテンツマニフェストに対して行われるため、クライアントサイド JavaScript は不要です。

[English](./README.md)

## 概要

`bases()` は次のようなフェンスブロックを認識します。

````md
```base
filters:
  and:
    - file.hasTag("featured")
properties:
  file.name:
    displayName: Title
  file.tags:
    displayName: Tags
views:
  - type: table
    name: Featured
    order:
      - file.name
      - file.tags
    limit: 10
```
````

レンダリングにはコンテンツマニフェスト（各ノートの frontmatter・タグ・リンク・パーマリンク）を使います。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { bases } from "@riebeckite/plugin-bases";

export default defineConfig({
  // ...
  plugins: [bases()],
});
```

## ブロックの構文

ブロック本体は Obsidian Base の YAML ドキュメントです。

| フィールド | 型 | 説明 |
| ---------- | -- | ---- |
| `filters` | 式 \| リスト \| オブジェクト | 全ビューに適用するトップレベルフィルタ（後述） |
| `properties` | オブジェクト | プロパティ ID → 表示名（または `{ displayName }`） |
| `views` | オブジェクト[] | 1 つ以上のビュー |

### ビュー

| フィールド | 型 | 説明 |
| ---------- | -- | ---- |
| `type` | `"table"` \| `"cards"` | 出力形式。既定は `table` |
| `name` | string | ビュー上部に表示する任意のラベル |
| `filters` | フィルタ | トップレベルフィルタに AND で合成する追加フィルタ |
| `order` | string \| string[] | 列（プロパティ ID）と表示順 |
| `columns` | string \| string[] | `order` の別名 |
| `sort` | オブジェクト \| オブジェクト[] \| string | ソートキー（後述） |
| `limit` | number | このビューの行数上限。`limit` オプション以下に制限される |

`sort` は Core 形式 `{ field, order }`、Obsidian 形式 `{ property, direction }`、短縮文字列（`"-file.name"` で降順）のいずれかを受け付けます。ビューに `order` / `columns` がない場合、列は `properties` のキー（定義順）、それもなければ `["file.name", "file.tags"]` になります。

### フィルタの文法

フィルタは式文字列、式のリスト（AND として扱う）、または `and` / `or` / `not` を持つオブジェクトです。`and` と `or` はリストを取り、`not` は式またはリスト（リストは AND でまとめてから否定）を取ります。プロパティ名をキーにした素のオブジェクトは等価比較として扱います。

| 式 | 説明 |
| -- | ---- |
| `file.hasTag("x")` | タグ `x`（またはサブタグ `x/...`）を持つ。大文字小文字は区別しない |
| `file.inFolder("x")` | スラグが `x` に一致するか `x/` で始まる |
| `file.hasLink("x")` | `x` へのリンクがある（解決済みスラグ・生のターゲット・ファイル名で照合） |
| `file.name` / `file.title` | ノートのタイトル |
| `file.path` / `file.slug` | スラグ |
| `file.folder` | スラグの親フォルダ |
| `file.link` / `file.permalink` | パーマリンク |
| `file.tags` | タグ |
| `note.key` / `key` | frontmatter の値 |

比較演算子は `==`、`!=`、`>`、`<`、`>=`、`<=`、`contains` です。文字列比較は大文字小文字を区別せず、`contains` は配列の要素または文字列の部分一致を調べます。スカラーのリストは AND として扱います。

```yaml
filters:
  and:
    - file.hasTag("featured")
    - or:
        - note.status == "published"
        - note.status == "review"
    - not:
        - file.hasTag("draft")
views:
  - type: table
    name: Featured
    order: [file.name, note.status]
    sort:
      - property: file.name
        direction: ASC
    limit: 20
```

## オプション

| オプション | 型 | 既定値 | 説明 |
| ---------- | -- | ------ | ---- |
| `className` | `string` | `"rb-bases"` | ルート CSS クラス |
| `language` | `string` | `"base"` | 対象とするフェンス言語 |
| `limit` | `number` | `100` | 全ビューに適用する行数上限 |
| `showFallback` | `boolean` | `true` | 生の Base 定義を `<details>` のフォールバックに表示する |
| `view` | `string` | なし | Base に複数ビューがあるとき、指定名のビューだけをレンダリングする |

## 出力 HTML / CSS フック

```html
<div class="rb-bases" data-bases data-bases-view="table">
  <section class="rb-bases__view" data-bases-view="table">
    <h3 class="rb-bases__view-name">Featured</h3>
    <table class="rb-bases__table"> ... </table>
  </section>
  <details class="rb-bases__fallback"> ... </details>
</div>
```

安定クラス: `rb-bases`、`rb-bases__view`、`rb-bases__view-name`、`rb-bases__table`、`rb-bases__heading`、`rb-bases__cell`、`rb-bases__row`、`rb-bases__link`、`rb-bases__tags`、`rb-bases__tag`、`rb-bases__cards`、`rb-bases__card`、`rb-bases__card-title`、`rb-bases__fields`、`rb-bases__field`、`rb-bases__field-label`、`rb-bases__field-value`、`rb-bases__empty`、`rb-bases__fallback`、`rb-bases--error`。安定属性: `data-bases`、`data-bases-view`。

## 診断

YAML として不正なブロック、未対応のフィルタ式やビュー形状を使ったブロックはコードブロックのまま残し、`source: "@riebeckite/plugin-bases"` を付けて `file.message(...)` で報告します。

## 制限事項

これは Obsidian Bases の MVP サブセットです。

- レンダリングできるのは `table` と `cards` の 2 種類のビューだけです。
- インラインの論理演算子（`&&`、`||`、`!`）は未対応です。`and` / `or` / `not` の YAML 構造を使ってください。
- `if()` / `filter()` などの Base フォーミュラ関数は未対応です。
- ネストしたプロパティパスと `file.mtime` / `file.ctime` は `date` にマップされます。
- プロパティ同士の比較は未対応で、右辺はリテラルです。
- 結果はビルド時に確定します。参照先ノートの変更に応じてホストノートだけを再ビルドするのは今後の課題で、フルビルドでは常に正しく再計算されます。

## エクスポート

- `bases(options?)` — プラグインファクトリ（別名: `basesPlugin`）
- `remarkBases(options?)` — 単体で使える remark トランスフォーム（`options.language` でフェンス言語を選択）
- `parseBases(document)` — パース済み YAML Base ドキュメントをスペックにコンパイル
- `matchesCondition(condition, entry)` — 条件評価関数
- 型: `BasesOptions`、`BasesSpec`、`BasesView`、`BasesViewType`、`BasesCondition`、`BasesValueRef`、`BasesBuiltinValue`、`BasesOperator`、`BasesLiteral`

## 関連

- [プラグインガイド](../../../docs/docs/reference/plugin-api.ja.md)

