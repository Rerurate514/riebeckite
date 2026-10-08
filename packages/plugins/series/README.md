# @riebeckite/plugin-series

<!-- Generated from docs/docs/plugins/series.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

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

The plugin also declares page types, so it exposes a list page at `/series`
and one landing page per series at `/series/<name>`. Both are built from the
discoverable manifest, so unlisted, draft, and scheduled notes never appear.

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
| `basePath` | `string` | `"/series"` | Base path for the generated pages. An empty string disables them. |

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

## Page types

The plugin registers two page types. Both derive their output from
`manifest.discoverableEntries`, so non-public notes are excluded.

| Page type | Path | Output |
| --------- | ---- | ------ |
| `series-list` | `<basePath>` (`/series`) | `<section class="rb-series rb-series--list">` listing each series with a link to its landing page. Generated only when at least one series exists. |
| `series-index` | `<basePath>/<name>` (`/series/<name>`) | The `renderSeriesIndex()` section for one series, in the existing order. |

The `<name>` segment is a lowercase, hyphenated slug; non-ASCII names fall back
to percent-encoding. Set `basePath` to match a custom routing scheme, or pass
`basePath: ""` to disable the pages and render them yourself.

## Exports

- `series(options?)` / `seriesPlugin(options?)` — plugin factory
- `buildSeriesIndex(manifest, name, options?)` — ordered members for one series
  (`SeriesIndex | null`); useful for landing pages
- `renderSeriesIndex(manifest, name, options?)` — standalone `<section>` block
  for a whole series
- `renderSeriesList(manifest, options?, label?)` — standalone `<section>` block
  listing every series; returns `""` when there are none
- `seriesLandingPath(name, options?)` — landing path for a series, or `""` when
  the pages are disabled
- `seriesSlug(name)` — URL segment used by a series landing page
- `renderSeriesNavigation(index, currentSlug, options?)` — a single navigation
  block
- `collectSeriesIndexes(manifest, options?)` — every series in first-seen order
- `resolveSeriesOptions(options?)` — options with defaults applied
- `DEFAULT_SERIES_BASE_PATH` — default `basePath` (`"/series"`)
- Types: `SeriesOptions`, `ResolvedSeriesOptions`, `SeriesMember`, `SeriesIndex`

### Series landing page

The plugin generates these pages automatically. To render them yourself, or to
reuse the markup elsewhere, combine the exported helpers:

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
- A series of one note produces no navigation block on the note, but it still
  gets a list entry and a landing page.
- `series_order` must be a finite number; numeric strings are not coerced.
- Series names that slugify to the same segment share the first landing page.
- Generated pages use `/series` by default; change `basePath` to avoid clashes
  with existing routes.

## See also

- [Plugin guide](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.md)
