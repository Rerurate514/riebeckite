---
date: 2026-11-22
title: Dataset
---
# Dataset

Versioned NDJSON exports of the published content graph, written at build
time.

[日本語](./dataset.ja.md)

## Overview

`dataset()` writes three generated files under `data/` (configurable with the
`directory` option):

- `pages.ndjson`: one JSON object per discoverable note —
  `{ slug, permalink, title, tags, date, excerpt, body }` plus `language`
  for localized notes
- `links.ndjson`: one JSON object per resolved note-to-note link —
  `{ sourceSlug, sourcePermalink, targetSlug, targetPermalink, raw, embed }`
- `index.json`: `{ schemaVersion, generator, pages, links }` — the dataset
  schema version and record counts

The dataset reads `manifest.discoverableEntries`, so `unlisted`, `draft`, and
scheduled notes never appear in the output. Links whose source or target is
not a discoverable note are dropped, and non-note links (images, attachments,
unresolved wikilinks) are excluded from `links.ndjson`. `slug` stays the
internal identity and `permalink` the public URL. `excerpt` prefers the
frontmatter `description` and falls back to the note body (180 characters);
`body` carries up to 4,000 characters of plain text.

Output is deterministic: records are sorted by slug and the files contain no
timestamps, so building the same vault twice produces identical files.

## Schemas

The package ships normative JSON Schema documents for every record type, so
standalone consumers can validate the downloaded files without installing any
Riebeckite package:

```text
@riebeckite/plugin-dataset/schema/pages.schema.json
@riebeckite/plugin-dataset/schema/links.schema.json
@riebeckite/plugin-dataset/schema/index.schema.json
```

Each `pages.ndjson` line is one `pages` record, each `links.ndjson` line is one
`links` record, and `index.json` matches `index`. The plugin's tests validate
generated output against these schemas and check the `index.json` record
counts, so a schema and implementation drift fails the build.

`schemaVersion` counts breaking changes to the record shapes: appending an
optional field keeps the version, while removing, renaming, or redefining a
field bumps it. See
[the dataset schema versioning ADR](https://github.com/Rerurate514/riebeckite/blob/main/docs/agents/adr/20261122-101500-dataset-schema-versioning-9d3f2a.md).

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
| `exclude` | `string[]` | `[]` | Slug paths (and their descendants) dropped from every output, matching the discovery exclude semantics of other plugins |

## Exports

- `dataset()` — plugin factory
- `buildDatasetPages(entries, excludedSlugs?)` — page records from discoverable entries
- `buildDatasetLinks(entries, excludedSlugs?)` — link records between discoverable notes
- `buildDatasetOutputs(entries, directory, excludedSlugs?)` — planned generated outputs
- `buildDatasetIndex(pages, links)` — `DatasetIndex` record
- `toNdjson(records)` — NDJSON serialization
- Constants: `DATASET_SCHEMA_VERSION`, `DEFAULT_DATASET_DIRECTORY`, `DATASET_GENERATOR`
- Types: `DatasetPage`, `DatasetLink`, `DatasetIndex`, `DatasetPluginOptions`

## See also

- [Plugin guide](../reference/plugin-api.md)
