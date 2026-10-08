<!-- Generated from packages/plugins/properties/README_ja.md. Do not edit this page directly; edit the package README and run `pnpm docs:sync`. -->

# Properties

ノートの frontmatter を、Obsidian 風のプロパティパネルとしてビルド時に描画するプラグインです。クライアント側の JavaScript は不要です。

[English](./properties.md)

## できること

マニフェスト生成時に、`properties()` が各エントリの frontmatter から `section.rb-properties[data-properties]` を生成します。本文は書き換えず、パネルを `ContentManifestEntry.bodySlots["article.metadata"]` として提供します。描画位置は Site が決めます。情報源は frontmatter だけなので、Markdown 本文に書くことはありません。

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
| `include` | `string[]` | なし | このキーだけを描画 |
| `exclude` | `string[]` | `["publish", "permalink", "aliases", "redirect_from"]` | 非表示にするキー |
| `order` | `string[]` | なし | 選択したキーの表示順。列挙したキーが先頭に並び、残りは frontmatter 順 |
| `hideEmpty` | `boolean` | `true` | `null`、`""`、`[]`、`{}` を省略 |
| `className` | `string` | `"rb-properties"` | ルート要素の CSS クラス |
| `collapsed` | `boolean` | `false` | `<details>` の中に描画 |

```ts
properties({
  title: "メタデータ",
  exclude: ["publish", "permalink", "aliases", "redirect_from", "draft"],
  collapsed: true,
});
```

### metadata slot に描画する

パネルは `ContentManifestEntry.bodySlots["article.metadata"]` に書き込まれます。Site の route は `bodySlots` を article component へ渡し、layout で metadata の位置を決めます。`include` と `order` を組み合わせると、表示するキーと並び順をサイト設定で決められます。

```tsx
// app/components/article.tsx（Site 側）
import type { ContentBodySlots } from "@riebeckite/core";
import { ContentSlot } from "@riebeckite/honox/ui";

function SiteArticle({ bodySlots }: { bodySlots?: ContentBodySlots }) {
  return (
    <ContentSlot
      slots={bodySlots}
      name="article.metadata"
      class="site-article__metadata"
    />
  );
}
```

```ts
properties({
  include: ["title", "created", "updated", "tags"],
  order: ["title", "created", "updated", "tags"],
});
```

Site への受け渡しは [`ContentManifestEntry.bodySlots`](../framework/honox-integration.ja.md) の contract に従います。Plugin は route や shell を所有しません。

## エクスポート

- `properties(options?)` / `propertiesPlugin(options?)` — プラグインファクトリ
- `resolvePropertiesOptions(options?)` — 既定値の解決
- `renderPropertiesPanel(frontmatter, options?, context?)` — 純粋な描画関数
- `buildTagHref(tag)` — タグ URL の生成
- 型: `PropertiesOptions`、`ResolvedPropertiesOptions`、`PropertiesRenderContext`、`PropertiesLinkResolver`、`PropertiesMessage`

## 関連資料

- [プラグインシステム](../reference/plugin-api.ja.md)
