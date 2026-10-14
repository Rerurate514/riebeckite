---
title: Series
sidebar:
  hidden: true
---

# Series

順序を持ってまとまるコンテンツの集合で、frontmatterのseries fieldで設定します。seriesの一覧は、同じseries値を持つcontent collectionから作られます。

## 設定

```yaml
---
series: Building a Theme
---
```

## 順序と一覧

同じseries値を持つentryをまとめ、通常は日付か明示したorderで並べます。一覧はseries fieldを対象にしたcontent collectionです。

## seriesプラグインのオプション

seriesプラグインは`SeriesOptions`（`packages/plugins/series/src/types.ts`）を受け入れ、seriesのグループ化とレンダリングを構成します。主なオプションには以下があります：

- `key`（既定: `"series"`）：seriesを名前づけるfrontmatter key
- `orderKey`（既定: `"series_order"`）：数値orderを持つfrontmatter key
- `titleKey`（既定: `"series_title"`）：表示タイトルをオーバーライドするfrontmatter key
- `heading`（既定: `true`）：seriesのheadingをpartリストの上にレンダリングするか
- `className`（既定: `"rb-series"`）：CSSクラス名の接頭辞
- `positionLabel`（既定: `false`）：current note用の"Part N of M"ラベルをレンダリングするか
- `basePath`（既定: `"/series"`）：seriesランディングページのbase path

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

`collectSeriesIndexes`関数（`packages/plugins/series/src/series.ts`）はseriesを宣言するすべてのマニフェストエントリをグループ化し、first-seen orderでone `SeriesIndex`per seriesを返します。membersはorderKeyによって、次にdate、title、slugによって並べられ、決定論的なtiesが解決されます。
