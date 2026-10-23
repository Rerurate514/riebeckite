---
date: 2026-10-14
title: シリーズ（Series）
sidebar:
  hidden: true
---

# シリーズ（Series）

順序を持ってまとまるコンテンツの集合で、frontmatterのseriesフィールドで設定します。シリーズ一覧は、同じseries値を持つコンテンツコレクションから作られます。

## 設定

```yaml
---
series: Building a Theme
---
```

## 順序と一覧

同じseries値を持つエントリをまとめ、通常は日付か明示したorderで並べます。一覧は、seriesフィールドを対象にした[コンテンツコレクション](./content-collection.md)です。

## シリーズプラグインのオプション

シリーズプラグインは `SeriesOptions`（`packages/plugins/series/src/types.ts`）を受け取り、シリーズのグループ化と描画を設定します。主なオプションは次のとおりです。

- `key`（既定：`"series"`）：シリーズ名を持つfrontmatterキー
- `orderKey`（既定：`"series_order"`）：数値の順序を持つfrontmatterキー
- `titleKey`（既定：`"series_title"`）：表示するシリーズタイトルを上書きするfrontmatterキー
- `heading`（既定：`true`）：パーツ一覧の上にシリーズの見出しを描画するか
- `className`（既定：`"rb-series"`）：CSSクラス名の接頭辞
- `positionLabel`（既定：`false`）：現在のノートに「Part N of M」ラベルを描画するか
- `basePath`（既定：`"/series"`）：シリーズのランディングページのベースパス

```ts
// From packages/plugins/series/src/types.ts
export type SeriesOptions = {
  key?: string;
  orderKey?: string;
  titleKey?: string;
  heading?: boolean;
  className?: string;
  positionLabel?: boolean;
  basePath?: string;
};
```

`collectSeriesIndexes` 関数（`packages/plugins/series/src/series.ts`）は、シリーズを宣言するすべてのマニフェストエントリをグループ化し、シリーズごとに1つの `SeriesIndex` を、最初に現れた順で返します。メンバーは `orderKey`、次に日付、タイトル、slugの順で並べられ、同着でも順序が決まるようになっています。
