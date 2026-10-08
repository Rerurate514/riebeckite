# @riebeckite/plugin-query

<!-- Generated from docs/docs/plugins/query.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Turn `query` code blocks into lists or tables of content. Filtering, sorting,
and pagination run against frontmatter and tags at build time, so no client-side
JavaScript is required.

[日本語](./README_ja.md)

## Overview

`queryPlugin()` recognises fenced blocks

````md
```query
filter:
  tags:
    any: [diary]
sort:
  field: date
  order: desc
limit: 5
```
````

and renders them using the content manifest (every note's frontmatter, tags, and
permalink).

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { queryPlugin } from "@riebeckite/plugin-query";

export default defineConfig({
  // ...
  plugins: [queryPlugin()],
});
```

## Block syntax

The block body is a YAML mapping. Every field is optional.

| Field | Type | Description |
| ----- | ---- | ----------- |
| `filter` | object | Filtering conditions (below) |
| `sort` | object \| object[] | `field` (a frontmatter key, `title`, `slug`, or `permalink`) and `order` (`asc` / `desc`, default `asc`). The default field is `date` |
| `limit` | number | Maximum number of entries |
| `offset` | number | Entries to skip from the top |
| `format` | `"table"` \| `"list"` | Output format. Defaults to `table` |
| `columns` | string[] | Table columns: presets (`title`, `date`, `updated`, `created`, `published`, `tags`, `description`, `permalink`) or frontmatter keys |
| `excludeSelf` | boolean | Exclude the note hosting the block from its own results |
| `empty` | string | Message shown when nothing matches |

### `filter`

| Field | Type | Description |
| ----- | ---- | ----------- |
| `tags.any` | string[] | Has at least one of these tags |
| `tags.all` | string[] | Has every one of these tags |
| `tags.none` | string[] | Has none of these tags |
| `folder` | string \| string[] | Slug prefix match |
| `frontmatter` | object | Frontmatter equality. An array matches any member; string comparisons are case-insensitive |
| `date` | object | `field` (default `date`) plus inclusive `from` / `to` bounds |

```yaml
filter:
  tags:
    any: [diary, note]
    none: [draft]
  folder: articles
  frontmatter:
    draft: false
  date:
    field: published
    from: 2024-01-01
    to: 2024-12-31
sort:
  - field: date
    order: desc
  - field: title
limit: 10
format: list
```

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `className` | `string` | `"rr-query"` | Root CSS class |
| `language` | `string` | `"query"` | Fence language to target |
| `defaultFormat` | `"table"` \| `"list"` | `"table"` | Format when a block omits `format` |
| `defaultColumns` | `string[]` | `["title", "date"]` | Columns when a block omits `columns` |
| `defaultSort` | object | none | Sort when a block omits `sort` |
| `defaultLimit` | `number` | none | Row cap when a block omits `limit` |
| `emptyMessage` | `string` | `"No matching content."` | Empty-state message |
| `excludeSelf` | `boolean` | `false` | Exclude the host page by default |

## Diagnostics

A block that is not valid YAML (or not a mapping) renders an inline error and
emits a `content-query-invalid` error diagnostic. Unknown fields emit a
`content-query-unknown-field` warning.

## Limitations

- Links produced by a query are not added to the content graph (backlinks).
  Only links written in the source Markdown participate.
- Results are fixed at build time. Rebuilding a host note when a queried note
  changes is future work; a full build always recomputes correctly.

## Exports

- `queryPlugin(options?)` — plugin factory
- `remarkQuery(options?)` — remark transform usable on its own (`options.language` selects the fence language)
- `queryContentEntries(entries, spec)` — the Core matching engine (also
  available from `@riebeckite/core`)
- Types: `QueryOptions`, `QuerySpec`, `QueryOutputFormat`

## See also

- [Plugin guide](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.md)
