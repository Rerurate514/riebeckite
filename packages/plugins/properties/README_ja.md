# @riebeckite/plugin-properties

ノートのフロントマターを、Obsidian 風のプロパティパネルとしてビルド時に描画するプラグインです。クライアント側の JavaScript は不要です。

[English](./README.md)

## できること

マニフェスト生成時に、`properties()` が各エントリのフロントマターから `section.rb-properties[data-properties]` を生成し、本文の先頭（または末尾）に挿入します。`render: "slot"` を指定すると、本文を書き換えずに `ContentManifestEntry.bodySlots.properties` として提供し、描画位置は Site が決めます。情報源はフロントマターだけなので、Markdown 本文に書くことはありません。

値は型に応じて描画されます。

| 値 | 出力 |
| --- | --- |
| 配列 | `ul.rb-properties__list`（要素ごとに 1 項目） |
| タグキー（`tags` / `tag`）または `#` で始まる値 | タグページへの `a.rb-properties__tag` |
| 真偽値 | `data-boolean` 付きの `true` / `false` |
| 数値 | `data-number` 付きの数値 |
| ISO 日付文字列または `Date` | `<time datetime>` |
| 文字列内の `[[ウィキリンク]]` や URL | リンク化（ウィキリンクはコンテンツインデックスで解決） |
| ネストしたオブジェクト | ネストした `<dl>` |

構造化 HTML として描画できない値は、エスケープしたテキストとして出力し、`properties-unrenderable-value` の警告を生成します。

## 設定

```ts
import { defineConfig } from "@riebeckite/core";
import { properties } from "@riebeckite/plugin-properties";

export default defineConfig({
  // ...
  plugins: [properties()],
});
```

## オプション

| オプション | 型 | 既定値 | 内容 |
| --- | --- | --- | --- |
| `title` | `string \| null` | `"Properties"` | 見出し。`null` で省略 |
| `position` | `"start" \| "end"` | `"start"` | 本文の前か後ろに挿入 |
| `include` | `string[]` | なし | このキーだけを描画 |
| `exclude` | `string[]` | `["publish", "permalink", "aliases", "redirect_from"]` | 非表示にするキー |
| `order` | `string[]` | なし | 選択したキーの表示順。列挙したキーが先頭に並び、残りはフロントマター順 |
| `render` | `"html" \| "slot"` | `"html"` | `"html"` は本文先頭・末尾に挿入、`"slot"` は `bodySlots.properties` として提供 |
| `hideEmpty` | `boolean` | `true` | `null`、`""`、`[]`、`{}` を省略 |
| `className` | `string` | `"rb-properties"` | ルート要素の CSS クラス |
| `collapsed` | `boolean` | `false` | `<details>` の中に描画 |

```ts
properties({
  title: "メタデータ",
  position: "end",
  exclude: ["publish", "permalink", "aliases", "redirect_from", "draft"],
  collapsed: true,
});
```

### body slot として描画する

`render: "slot"` では、パネルを `ContentManifestEntry.bodySlots.properties` に書き込み、Site の route が好きな位置で描画します。`include` と `order` を組み合わせると、表示するキーと並び順をサイト設定で決められます。

```tsx
// app/components/article.tsx（Site 側）
<div
  class="article-properties"
  dangerouslySetInnerHTML={{ __html: propertiesHtml }}
/>;
```

```ts
properties({
  render: "slot",
  include: ["title", "created", "updated", "tags"],
  order: ["title", "created", "updated", "tags"],
});
```

Site への受け渡しは [`ContentManifestEntry.bodySlots`](../../../docs/ja/docs/framework/honox-integration.md) の contract に従います。Plugin は route や shell を所有しません。

## エクスポート

- `properties(options?)` / `propertiesPlugin(options?)` — プラグインファクトリ
- `resolvePropertiesOptions(options?)` — 既定値の解決
- `renderPropertiesPanel(frontmatter, options?, context?)` — 純粋な描画関数
- `buildTagHref(tag)` — タグ URL の生成
- 型: `PropertiesOptions`、`PropertiesPosition`、`PropertiesRenderMode`、`ResolvedPropertiesOptions`、`PropertiesRenderContext`、`PropertiesLinkResolver`、`PropertiesMessage`

## 関連資料

- [プラグインシステム](../../../docs/ja/docs/reference/plugin-api.md)

