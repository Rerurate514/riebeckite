---
title: Series
sidebar:
  hidden: true
---

# Series

A grouping of content that belongs together in order, set through the series frontmatter field. A series list is built from a content collection over the same series value.

## Setting it

```yaml
---
series: Building a Theme
---
```

## Ordering and lists

Entries with the same series value are grouped, usually ordered by date or by an explicit order. The list is a [content collection](./content-collection.md) over the series field.

## Series plugin options

The series plugin accepts `SeriesOptions` (`packages/plugins/series/src/types.ts`) which configure the series grouping and rendering. Key options include:

- `key` (default: `"series"`) — frontmatter key that names the series
- `orderKey` (default: `"series_order"`) — frontmatter key that holds the numeric order
- `titleKey` (default: `"series_title"`) — frontmatter key that overrides the displayed series title
- `heading` (default: `true`) — whether to render the series heading above the part list
- `className` (default: `"rb-series"`) — base CSS class prefix
- `positionLabel` (default: `false`) — whether to render a "Part N of M" label for the current note
- `basePath` (default: `"/series"`) — base path for series landing pages

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

The `collectSeriesIndexes` function (`packages/plugins/series/src/series.ts`) groups every manifest entry that declares a series and returns one `SeriesIndex` per series, in first-seen order. Members are sorted by `orderKey`, then by date, title, and slug for deterministic ties.
