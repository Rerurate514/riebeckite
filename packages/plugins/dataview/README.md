# @riebeckite/plugin-dataview

Evaluate declarative `dataview` code blocks against the content manifest at
build time and render them as lists, tables, task lists, or calendars. No
client-side JavaScript is required.

[日本語](./README_ja.md)

## Overview

`dataviewPlugin()` recognises fenced blocks whose language is `dataview`:

````md
```dataview
TABLE file.name AS "Name", status
FROM #project
WHERE status = "active"
SORT file.name asc
LIMIT 10
```
````

and renders them from the manifest using each public note's frontmatter, tags,
links, and permalink. Unlisted, draft, and scheduled notes are excluded from
queries. DataviewJS (`dataviewjs`) is **not** supported: those blocks stay
code blocks and produce a diagnostic.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { dataviewPlugin } from "@riebeckite/plugin-dataview";

export default defineConfig({
  // ...
  plugins: [dataviewPlugin()],
});
```

## Query syntax

A block starts with a query type (`LIST`, `TABLE`, `TASK`, or `CALENDAR`)
followed by optional clauses:

```
LIST|TABLE|TASK|CALENDAR [expression or columns]
FROM <source expression>
WHERE <boolean expression>
SORT <field> [asc|desc][, ...]
GROUP BY <field>
LIMIT <n>
```

Clauses are case-insensitive. Each clause starts on its own line, but a clause
body may span multiple lines.

### `LIST`

`LIST` renders an unordered list of matching notes. An optional trailing
expression is shown as metadata next to the link:

```dataview
LIST file.date
FROM #diary
SORT file.date desc
```

### `TABLE`

`TABLE` renders a table. When no columns are given, a single `file.link` column
is used. Columns are field paths, optionally renamed with `AS`:

```dataview
TABLE file.name AS "Name", status, priority
FROM #project
```

### `TASK`

`TASK` extracts the task list items (`- [ ]` / `- [x]`) from every matching
note and renders them as `<ul class="rb-dataview__tasks">`. `FROM` and `WHERE`
select the **pages**, not individual tasks:

```dataview
TASK
FROM #project
```

### `CALENDAR`

`CALENDAR` renders a month grid. The optional trailing expression selects the
date field (default `date`). The month of the most recent matched date is shown:

```dataview
CALENDAR date
FROM #project
```

## Clauses

### `FROM`

`FROM` selects candidate notes. Sources are:

| Source | Meaning |
| ------ | ------- |
| `#tag` | Has the tag |
| `"folder"` | Slug is the folder or lives under it |
| `[[note]]` | Links to `note` (incoming links) |

Combine sources with `and` / `or`, negate with `!` or `-`, and group with
parentheses. Adjacent sources are treated as `and`.

```dataview
FROM (#project or #area) and "notes" and !#archive
```

### `WHERE`

`WHERE` filters notes with a boolean expression over `file.*` and frontmatter
fields.

| Feature | Examples |
| ------- | -------- |
| Comparison | `status = "active"`, `priority > 2`, `date <= "2026-12-31"` |
| Boolean | `status = "active" and !draft`, `a or b` |
| `contains()` | `contains(file.tags, "#project")`, `contains(tags, "project")` |
| `date()` | `date(due) >= date("2026-01-01")` |
| `number()` / `string()` | `number(weight) > 3` |

String `=`/`!=` comparisons and `contains()` are case-insensitive. `date()`
returns a millisecond timestamp (or `null`), so `date(a) < date(b)` compares
chronologically. `null`/missing values never satisfy `<`/`>` comparisons.

`file.*` fields: `file.name`, `file.title`, `file.slug`, `file.path`,
`file.folder`, `file.link`, `file.permalink`, `file.url`, `file.tags`,
`file.date`, `file.created`, `file.updated`, `file.published`. Other frontmatter
keys are read directly by name (`status`, `priority`, `due`, ...).

### `SORT`

`SORT` accepts a comma-separated list of fields with an optional direction
(`asc`, the default, or `desc`). Notes with a missing field sort last.

```dataview
SORT priority desc, file.name asc
```

### `GROUP BY`

`GROUP BY <field>` groups the matched notes. Each group is headed by the group
value; `LIST` and `TASK` render one list per group, and `TABLE` inserts a group
row. Groups keep the order established by `SORT`.

### `LIMIT`

`LIMIT <n>` caps the number of rendered notes (before grouping). It can also be
set for every block with the `limit` option.

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `className` | `string` | `"rb-dataview"` | Root CSS class |
| `language` | `string` | `"dataview"` | Fence language to target |
| `hideFallback` | `boolean` | `false` | Hide the raw-query `<details>` fallback |
| `limit` | `number` | none | Default `LIMIT` when a block omits one |

## Rendering

Each block becomes:

```html
<div class="rb-dataview" data-dataview data-dataview-type="list">
  <!-- list, table, task, or calendar output -->
  <details class="rb-dataview__fallback">
    <summary>Dataview query</summary>
    <pre><code>LIST FROM #project</code></pre>
  </details>
</div>
```

The readable `<details>` fallback contains the raw query and can be disabled
with `hideFallback`.

## Diagnostics

- `dataviewjs` blocks are left untouched and emit a
  `dataview-unsupported-language` **warning**. The markdown-time remark
  transform also records a `file.message` with
  `source: "@riebeckite/plugin-dataview"`.
- Blocks the parser or evaluator cannot handle render an inline error box and
  emit a `dataview-invalid` **error** diagnostic. Unsupported syntax is also
  reported through `file.message` while the markdown is parsed.

## Limitations

- **No DataviewJS.** `dataviewjs` is intentionally unsupported.
- **No inline fields** (`field:: value`). Only frontmatter is read.
- **`TABLE` columns are field paths**, not arbitrary expressions. Rename with
  `AS "Label"`; computed columns (for example `file.size / 1024`) are not
  supported.
- **`TASK` filters pages, not tasks.** `WHERE`/`FROM` apply to the notes that
  contain tasks.
- **`CALENDAR` shows one month** — the month of the most recent matched date.
- `file.size`, `file.mtime`, and `file.ctime` are not available from the
  manifest and evaluate to `undefined`.
- Results are fixed at build time and links produced by a dataview block are not
  added to the content graph (backlinks). A full build always recomputes
  correctly.

## Exports

- `dataviewPlugin(options?)` / `dataview(options?)` — plugin factory
- `remarkDataview(options?)` — remark transform usable on its own
- `parseDataview(source)` — parse a block body into a `DataviewSpec`
- `selectDataviewEntries(spec, manifest, defaultLimit)` — matching engine
- `evaluateDataviewExpression(expression, scope)` and
  `matchesDataviewFrom(from, entry, manifest)` — expression helpers
- `renderDataview(selection, spec, options, source)` — HTML renderer
- `resolveDataviewOptions(options?)` — normalise plugin options
- `DATAVIEW_ATTRIBUTE` — placeholder attribute name
- Types: `DataviewOptions`, `DataviewSpec`, `DataviewQueryType`,
  `DataviewExpression`, `DataviewFrom`, and friends

## See also

- [Plugin guide](../../../docs/en/docs/reference/plugin-api.md)

