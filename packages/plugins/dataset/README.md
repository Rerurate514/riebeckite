# @riebeckite/plugin-dataset

<!-- Generated from docs/docs/plugins/dataset.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Versioned NDJSON exports of the published content graph, written at build
time.

[日本語](./README_ja.md)

## Overview

`dataset()` writes three generated files under `data/` (configurable with the
`directory` option):

- `pages.ndjson`: one JSON object per discoverable note —
  `{ slug, permalink, title, tags, date }`
- `links.ndjson`: one JSON object per resolved note-to-note link —
  `{ sourceSlug, sourcePermalink, targetSlug, targetPermalink, raw, embed }`
- `index.json`: `{ schemaVersion, generator, pages, links }` — the dataset
  schema version and record counts

The dataset reads `manifest.discoverableEntries`, so `unlisted`, `draft`, and
scheduled notes never appear in the output. Links whose source or target is
not a discoverable note are dropped, and non-note links (images, attachments,
unresolved wikilinks) are excluded from `links.ndjson`. `slug` stays the
internal identity and `permalink` the public URL.

Output is deterministic: records are sorted by slug and the files contain no
timestamps, so building the same vault twice produces identical files.

## Installation

```sh
npm install @riebeckite/plugin-dataset
```

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { dataset } from "@riebeckite/plugin-dataset";

export default defineConfig({
  plugins: [dataset()],
});
```

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `directory` | `string` | `data` | Output directory relative to the site root, without empty, `.`, or `..` segments |

## Exports

- `dataset()` — plugin factory
- `buildDatasetPages(entries)` — page records from discoverable entries
- `buildDatasetLinks(entries)` — link records between discoverable notes
- `buildDatasetOutputs(entries, directory)` — planned generated outputs
- `buildDatasetIndex(pages, links)` — `DatasetIndex` record
- `toNdjson(records)` — NDJSON serialization
- Constants: `DATASET_SCHEMA_VERSION`, `DEFAULT_DATASET_DIRECTORY`, `DATASET_GENERATOR`
- Types: `DatasetPage`, `DatasetLink`, `DatasetIndex`, `DatasetPluginOptions`

## See also

- [Plugin guide](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.md)
