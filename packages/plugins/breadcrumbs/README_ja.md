# @riebeckite/plugin-breadcrumbs

<!-- Generated from docs/docs/plugins/breadcrumbs.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

ノートの公開 URL 階層からパンくずナビゲーションをビルド時に生成する
プラグインです。パンくず列のデータとサイト用の `<Breadcrumbs />` コンポーネントを
提供し、階層構造を反映した BreadcrumbList の JSON-LD も出力します。クライアント側
JavaScript は不要です。

[English](./README.md)

## 実行例

記事の上に表示されている **Riebeckite / Docs / Plugins / Breadcrumbs** が、このプラグインの出力です。ページのフォルダとタイトルから組み立てられ、同じ内容が `BreadcrumbList` の JSON-LD としても出力されます。

## 仕組み

`breadcrumbs()` はエントリのスラッグを「/」で区切り、必ずサイトのホームから
始まるパンくず列を作ります。

- `folder/sub-folder/note` の場合: `ホーム / folder / sub-folder / note`
- サイト直下のノートの場合: `ホーム / note`

途中のフォルダはマニフェストと突き合わせて解決します。フォルダ自身に
インデックスノート（フォルダと同名のスラッグを持つノート）があればその
タイトルを使い、なければセグメントをタイトルケース（先頭を大文字にする）にして
代用します。最後のパンくずはそのノート自身で、パーマリンクへリンクします。

プラグインはエントリの HTML を変更しません。リファレンスサイトが記事の上に
`<Breadcrumbs />` を描画し、コンポーネントが現在のエントリから同じパンくず列を
組み立てます。フィードの本文は変更されません。

## JSON-LD

`breadcrumbs()` は階層的な BreadcrumbList を `entry.headTags` の
`<script type="application/ld+json">` として提供します。サイトシェルがこれを
文書の `<head>` に描画します（リファレンスアプリの `_renderer.tsx` は
`entry.headTags` を描画します）。アイテムの URL は設定の `baseUrl` に基づき
絶対 URL に変換されます。

`seo` プラグインも有効な場合、seo 側は独自の 2 階層の BreadcrumbList
（`ホーム / ノート`）を記事 JSON-LD に含めようとします。ページの `headTags`
を seo 拡張へ渡すと、本プラグインが提供した BreadcrumbList を検出して seo 側の
暫定版を省略するため、サイト側で調整しなくても BreadcrumbList は 1 つだけに
なります。本プラグインからの出力自体を止めたい場合は `jsonLd: false` を使います。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { breadcrumbs } from "@riebeckite/plugin-breadcrumbs";

export default defineConfig({
  // ...
  plugins: [breadcrumbs()],
});
```

## オプション

| オプション | 型 | 既定値 | 説明 |
| ---------- | -- | ------ | ---- |
| `homeLabel` | `string` | サイトタイトル | ホームのパンくずラベル |
| `className` | `string` | `"rb-breadcrumbs"` | ルート要素の CSS クラス |
| `ariaLabel` | `string` | `"Breadcrumbs"` | ナビゲーションのアクセシブル名 |
| `separator` | `string` | `"/"` | パンくず間の文字 |
| `jsonLd` | `boolean` | `true` | BreadcrumbList スクリプトを出力する |

```ts
breadcrumbs({
  homeLabel: "ブログ",
  separator: "›",
});
```

## 表示

サイトが記事の上に `<Breadcrumbs />` を描画すると、対象ページにパンくずが表示されます。このページでも、自身のパスに対応するナビゲーションを確認できます。

## スタイル

パッケージに `style.css` が含まれます。他のプラグインと同じように読み込みます。

```ts
import "@riebeckite/plugin-breadcrumbs/style.css";
```

## エクスポート

- `breadcrumbs(options?)`：プラグインファクトリ
- `Breadcrumbs`：パンくず列を描画するサイト用コンポーネント
- `getBreadcrumbs(...)`：現在のエントリ用のデータヘルパー
- `resolveBreadcrumbsOptions(options?)`：オプションの既定値を適用する
- `buildBreadcrumbItems({ manifest, entry, config, homeLabel })`：パンくず列を組み立てる
- `renderBreadcrumbNav(items, options)`：ナビゲーション HTML を生成する
- `buildBreadcrumbHeadTag(schema)` / `hasBreadcrumbHeadTag(headTags)`：head タグ用ヘルパー
- `buildBreadcrumbJsonLd(config, items)`：JSON-LD オブジェクトを生成する
- `BREADCRUMBS_ATTRIBUTE` / `BREADCRUMBS_PLUGIN_NAME`：定数
- 型: `BreadcrumbsOptions`, `ResolvedBreadcrumbsOptions`, `BreadcrumbItem`, `BreadcrumbsProps`

## 制約

- パンくず列はビルド時に確定します。再ビルドすれば常に正しく再計算されます。
- スラッグ階層のみを参照します。frontmatter の並び順や series プラグインの
  順序は意図的に考慮しません。

## 関連リンク

- [プラグイン API](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.ja.md)
