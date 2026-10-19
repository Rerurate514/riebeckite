# @riebeckite/plugin-properties

<!-- Generated from docs/docs/plugins/properties.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

ノートの frontmatter を、Obsidian 風のプロパティパネルとしてビルド時に描画するプラグインです。クライアント側の JavaScript は不要です。

[English](./README.md)

## できること

マニフェスト生成時に、`properties()` が各エントリの frontmatter から `section.rb-properties[data-properties]` を生成します。本文は書き換えず、パネルはビルド時の出力の一部として公開されます。情報源は frontmatter だけなので、Markdown 本文に書くことはありません。

値は型に応じて描画されます。

| 値 | 出力 |
| --- | --- |
| 配列 | `ul.rb-properties__list`（要素ごとに 1 項目） |
| タグキー（`tags` / `tag`）または `#` で始まる値 | タグページへの `a.rb-properties__tag` |
| 真偽値 | `data-boolean` 付きの `true` / `false` |
| 数値 | `data-number` 付きの数値 |
| ISO 日付文字列または `Date` | `<time datetime>` |
| 文字列内の `[ウィキリンク](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/ウィキリンク.ja.md)` や URL | リンク化（ウィキリンクはコンテンツインデックスで解決） |
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

`properties()` は `getProperties({ view, frontmatter, options? })` ヘルパーを提供し、 `PropertiesData` を返します。Site は `<Properties data={data} />` コンポーネントを好きな場所に描画します。`PropertiesOptions` は `title`、`include`、`exclude`、`order`、`hideEmpty`、`className`、`collapsed`（`render` オプションなし）を受け入れます。

```ts
properties({
  title: "メタデータ",
  exclude: ["publish", "permalink", "aliases", "redirect_from", "draft"],
  collapsed: true,
});
```

## 表示

プラグインはビルド時にプロパティパネルを描画します。Site はエクスポートされたコンポーネントをレイアウトの任意の位置に描画できます。

```tsx
import { getProperties, Properties } from "@riebeckite/plugin-properties";
import { content } from "virtual:riebeckite/content";

const manifest = await content.getManifest();
const entry = manifest.entries[slug];
const data = getProperties({ view, frontmatter: entry.frontmatter, options });

<Properties data={data} />;
```

プラグインは route や shell を所有しません。

## エクスポート

- `properties(options?)` / `propertiesPlugin(options?)`：プラグインファクトリ
- `resolvePropertiesOptions(options?)`：既定値の解決
- `getProperties({ view, frontmatter, options? })`：エントリ用のプロパティデータを解決
- `renderPropertiesPanel(frontmatter, options?, context?)`：純粋な描画関数
- `buildTagHref(tag)`：タグ URL の生成
- 型: `PropertiesOptions`、`ResolvedPropertiesOptions`、`PropertiesRenderContext`、`PropertiesLinkResolver`、`PropertiesMessage`

## 関連資料

- [プラグインシステム](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.ja.md)
