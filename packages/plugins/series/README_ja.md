# @riebeckite/plugin-series

連載記事（シリーズ）を順番どおりに並べ、各記事へ共通のナビゲーションを差し込むプラグインです。ビルド時に、同じシリーズ名を持つノートをまとめて、目次・現在位置・前後の記事リンクを生成します。

[English](./README.md)

## 概要

`series()` は frontmatter からシリーズ情報を読み取り、該当するノートをグループ化して並べ替えたうえで、各ノートの HTML に `<nav class="rb-series">` ブロックを追加します。リンクには Core が解決したパーマリンクを使うため、`permalink` プラグインなどとも併用できます。1件だけのシリーズにはナビゲーションを出力しません。

このプラグインはビルド時のみ動作し、クライアント用のランタイムは持ちません（スタイルシートのみを登録します）。

## 設定する

```ts
import { defineConfig } from "@riebeckite/core";
import { series } from "@riebeckite/plugin-series";

export default defineConfig({
  // ...
  plugins: [series()],
});
```

## frontmatter の書き方

| キー | 型 | 必須 | 説明 |
| ---- | -- | ---- | ---- |
| `series` | `string` | はい | グループ化に使うシリーズ名。 |
| `series_order` | `number` | 推奨 | シリーズ内の並び順（昇順）。 |
| `series_title` | `string` | いいえ | 見出しに表示するシリーズ名。 |

```yaml
---
title: 導入編
series: 何かを作る
series_order: 2
---
```

`series_order` が無い・不正なノートも対象に含まれます。その場合は番号付きの記事の後ろに並び、`date`／`created`／`published`、`title`、`slug` の順で安定して並べ替えます。同点の場合は常に決まった順序になります。

## オプション

| オプション | 型 | 既定値 | 説明 |
| ---------- | -- | ------ | ---- |
| `key` | `string` | `"series"` | シリーズ名を持つ frontmatter キー。 |
| `orderKey` | `string` | `"series_order"` | 並び順の数値を持つ frontmatter キー。 |
| `titleKey` | `string` | `"series_title"` | 見出しのシリーズ名を上書きするキー。 |
| `heading` | `boolean` | `true` | リストの上に見出しを表示する。 |
| `className` | `string` | `"rb-series"` | 生成する HTML の基準クラス名。 |
| `positionLabel` | `boolean` | `false` | 現在の記事に「Part N of M」を付ける。 |

## 出力

2件以上あるシリーズの各ノートには、次のブロックが HTML の末尾に追加されます。

```html
<nav class="rb-series" data-series="何かを作る"
     aria-label="Series navigation">
  <p class="rb-series__title">
    <a class="rb-series__link" href="/part-1">何かを作る</a>
  </p>
  <ol class="rb-series__list">
    <li class="rb-series__item">
      <a class="rb-series__link" href="/part-1" data-series-order="1">導入編</a>
    </li>
    <li class="rb-series__item">
      <a class="rb-series__link" href="/part-2" data-series-order="2"
         aria-current="page">実装編</a>
    </li>
  </ol>
  <div class="rb-series__nav">
    <a class="rb-series__prev" rel="prev" href="/part-1">&larr; 導入編</a>
    <a class="rb-series__next" rel="next" href="/part-3">仕上げ編 &rarr;</a>
  </div>
</nav>
```

テキストと属性はすべてエスケープします。生成した HTML は manifest の entry と処理済みコンテンツの両方へ書き戻すため、ページのルート表示・フィード・検索でも同じマークアップになります。

## 公開 API

- `series(options?)` / `seriesPlugin(options?)` — プラグインファクトリ
- `buildSeriesIndex(manifest, name, options?)` — 1つのシリーズの並び順付きメンバー（`SeriesIndex | null`）。ランディングページ向け
- `renderSeriesIndex(manifest, name, options?)` — シリーズ全体の `<section>` ブロック
- `renderSeriesNavigation(index, currentSlug, options?)` — ナビゲーション1つ分
- `collectSeriesIndexes(manifest, options?)` — 全シリーズを出現順で取得
- `resolveSeriesOptions(options?)` — 既定値を適用したオプション
- 型: `SeriesOptions`, `ResolvedSeriesOptions`, `SeriesMember`, `SeriesIndex`

### シリーズのランディングページ

```ts
import { buildSeriesIndex, renderSeriesIndex } from "@riebeckite/plugin-series";

// ルートコンポーネント内で、解決済みの manifest を使って:
const index = buildSeriesIndex(manifest, "何かを作る");
const html = renderSeriesIndex(manifest, "何かを作る");
```

## 診断

`pluginName: "series"`、`severity: "warning"` で出力します。

| コード | 意味 |
| ------ | ---- |
| `series-invalid-name` | シリーズのキーはあるが、空でない文字列になっていない。 |
| `series-missing-order` | 有効な数値の並び順キーが無く、代替の順序を使った。 |
| `series-duplicate-order` | 同じ `(シリーズ, 並び順)` の組を持つノートが複数ある。 |

## CSS フック

`style.css` は `.rb-series`、`.rb-series__title`、`.rb-series__position`、`.rb-series__list`、`.rb-series__item`、`.rb-series__nav`、`.rb-series__prev`、`.rb-series__next`、および `.rb-series--index` をスタイルします。現在の記事は `.rb-series__item a[aria-current="page"]` で判定できます。

## 制限

- 1つのノートが所属できるシリーズは1つだけです。
- 1件だけのシリーズにはナビゲーションを出力しません。
- `series_order` は有限の数値である必要があります。数値文字列は変換しません。
- シリーズ用のルートは生成しません。ランディングページを作る場合は `renderSeriesIndex()` を自前のページと組み合わせてください。

## 関連

- [プラグインガイド](../../../docs/ja/reference/plugin-api.md)
