# @riebeckite/plugin-series

Ordered multi-part posts ("series") for Riebeckite. At build time, notes that
share a series name get the same generated navigation listing every part in
order, with the current part marked and previous/next links.

[日本語](./README_ja.md)

## Overview

`series()` reads series metadata from frontmatter, groups every matching
manifest entry, sorts the group, and appends a `<nav class="rb-series">` block
to each note in the series. Links use the permalinks resolved by Core, so
plugins such as `permalink` are respected. A single-note series renders no
navigation block.

The plugin is build-time only: it ships a stylesheet asset and no client
runtime.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { series } from "@riebeckite/plugin-series";

export default defineConfig({
  // ...
  plugins: [series()],
});
```

## Frontmatter contract

| Key | Type | Required | Description |
| --- | ---- | -------- | ----------- |
| `series` | `string` | yes | Series name used for grouping. |
| `series_order` | `number` | recommended | Position within the series (ascending). |
| `series_title` | `string` | no | Display title for the series heading. |

```yaml
---
title: Installing the thing
series: Build a thing
series_order: 2
---
```

Notes missing a valid `series_order` are still included; they are ordered after
the numbered parts, using `date`/`created`/`published`, then `title`, then
`slug`. Ties always resolve deterministically.

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `key` | `string` | `"series"` | Frontmatter key that names the series. |
| `orderKey` | `string` | `"series_order"` | Frontmatter key holding the numeric order. |
| `titleKey` | `string` | `"series_title"` | Frontmatter key overriding the series heading. |
| `heading` | `boolean` | `true` | Render the series heading above the list. |
| `className` | `string` | `"rb-series"` | Base CSS class for generated markup. |
| `positionLabel` | `boolean` | `false` | Add a `Part N of M` label for the current note. |

## Output

Each note in a series of two or more parts gets the following block appended to
its HTML:

```html
<nav class="rb-series" data-series="Build a thing"
     aria-label="Series navigation">
  <p class="rb-series__title">
    <a class="rb-series__link" href="/build-a-thing">Build a thing</a>
  </p>
  <ol class="rb-series__list">
    <li class="rb-series__item">
      <a class="rb-series__link" href="/part-1" data-series-order="1">Part 1</a>
    </li>
    <li class="rb-series__item">
      <a class="rb-series__link" href="/part-2" data-series-order="2"
         aria-current="page">Part 2</a>
    </li>
  </ol>
  <div class="rb-series__nav">
    <a class="rb-series__prev" rel="prev" href="/part-1">&larr; Part 1</a>
    <a class="rb-series__next" rel="next" href="/part-3">Part 3 &rarr;</a>
  </div>
</nav>
```

All text and attributes are escaped. The injected HTML is written back to both
the manifest entry and the processed content object so the page route, feeds,
and search see the same markup.

## Exports

- `series(options?)` / `seriesPlugin(options?)` — plugin factory
- `buildSeriesIndex(manifest, name, options?)` — ordered members for one series
  (`SeriesIndex | null`); useful for landing pages
- `renderSeriesIndex(manifest, name, options?)` — standalone `<section>` block
  for a whole series
- `renderSeriesNavigation(index, currentSlug, options?)` — a single navigation
  block
- `collectSeriesIndexes(manifest, options?)` — every series in first-seen order
- `resolveSeriesOptions(options?)` — options with defaults applied
- Types: `SeriesOptions`, `ResolvedSeriesOptions`, `SeriesMember`, `SeriesIndex`

### Series landing page

```ts
import { buildSeriesIndex, renderSeriesIndex } from "@riebeckite/plugin-series";

// inside a route component, with the resolved manifest:
const index = buildSeriesIndex(manifest, "Build a thing");
const html = renderSeriesIndex(manifest, "Build a thing");
```

## Diagnostics

Emitted with `pluginName: "series"` and `severity: "warning"`:

| Code | Meaning |
| ---- | ------- |
| `series-invalid-name` | The series key is present but is not a non-empty string. |
| `series-missing-order` | The note has no valid numeric order key; fallback ordering is used. |
| `series-duplicate-order` | Two or more notes share the same `(series, order)` pair. |

## CSS hooks

`style.css` styles `.rb-series`, `.rb-series__title`, `.rb-series__position`,
`.rb-series__list`, `.rb-series__item`, `.rb-series__nav`, `.rb-series__prev`,
`.rb-series__next`, and the `.rb-series--index` variant. The current part is
matched with `.rb-series__item a[aria-current="page"]`.

## Limitations

- A note belongs to exactly one series.
- A series of one note produces no navigation block.
- `series_order` must be a finite number; numeric strings are not coerced.
- The plugin does not generate routes for series; combine
  `renderSeriesIndex()` with your own page to build a series landing page.

## See also

- [Plugin guide](../../docs/plugins_en.md)
