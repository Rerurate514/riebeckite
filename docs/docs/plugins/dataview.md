---
date: 2026-10-06
title: Dataview
---
# Dataview

Evaluate declarative `dataview` code blocks against the content manifest at
build time and render them as lists, tables, task lists, or calendars. No
client-side JavaScript is required.

[日本語](./dataview.ja.md)

## Overview

`dataview()` recognises fenced blocks whose language is `dataview`:

````md
```dataview
TABLE file.name AS "Name", status
FROM #project
WHERE status = "active"
SORT file.name asc
LIMIT 10
```
````

Blocks are rendered from the public manifest plus each note's Markdown source:
frontmatter, inline fields, tasks, tags, links, file metadata, and permalink.
Unlisted, draft, and scheduled notes are excluded from queries and their inline
fields and tasks are never read. DataviewJS (`dataviewjs`) is **not**
supported: those blocks stay code blocks and produce a diagnostic.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { dataview } from "@riebeckite/plugin-dataview";

export default defineConfig({
  // ...
  plugins: [dataview()],
});
```

## Query syntax

A block starts with a query type (`LIST`, `TABLE`, `TASK`, or `CALENDAR`)
followed by clauses:

```
LIST|TABLE|TASK|CALENDAR [expression or columns]
FROM <source expression>
WHERE <boolean expression>
FLATTEN <expression> [AS name]
SORT <expression> [asc|desc][, ...]
GROUP BY <expression> [AS name]
LIMIT <n>
```

Clauses are case-insensitive and each starts on its own line; a clause body may
span multiple lines. Commands run **in the order they are written**, and the
same command may appear more than once, matching Dataview:

```
LIMIT 5
SORT priority desc
```

### `LIST`

`LIST` renders an unordered list of matching notes. An optional trailing
expression is shown as metadata next to the link:

```dataview
LIST file.date
FROM #diary
SORT file.date desc
```

### `TABLE`

`TABLE` renders a table. The first column is always the file link unless the
query starts with `WITHOUT ID`. Each further column is an expression renamed
with `AS`:

```dataview
TABLE WITHOUT ID file.name AS "Name", status, priority * 2 AS "Score"
FROM #project
```

### `TASK`

`TASK` renders one row per task (`- [ ]` / `- [x]`) instead of one row per note.
`FROM` selects notes, then `WHERE`, `FLATTEN`, `SORT`, and `GROUP BY` run on
**individual tasks**:

```dataview
TASK
FROM #project
WHERE !completed and due >= date("2026-01-01")
SORT line asc
```

### `CALENDAR`

`CALENDAR` renders a month grid. The optional trailing expression selects the
date expression (default `date`). The month of the most recent matched date is
shown:

```dataview
CALENDAR date
FROM #project
```

## Clauses

### `FROM`

`FROM` selects candidate notes. Sources are:

| Source | Meaning |
| ------ | ------- |
| `#tag` | Has the tag or one of its subtags |
| `"folder"` | Slug is the folder or lives under it |
| `"notes/note.md"` | Exact note path |
| `[[note]]` | Links to `note` (incoming links) |

Combine sources with `and` / `or`, negate with `!` or `-`, and group with
parentheses. Adjacent sources are treated as `and`.

```text
FROM (#project or #area) and "notes" and !#archive
```

### `WHERE`

`WHERE` filters rows with a boolean expression over the row fields.

| Feature | Examples |
| ------- | -------- |
| Comparison | `status = "active"`, `priority > 2`, `due <= date("2026-12-31")` |
| Boolean | `status = "active" and !draft`, `a or b`, `&&` / `\|\|` |
| Arithmetic | `priority * 2 > 4`, `(a + b) / 2` |
| List literal | `contains(["a", "b"], status)` |
| String | `startswith(file.name, "2026")`, `lower(status) = "done"` |
| `contains()` | `contains(file.tags, "#project")`, `contains(tags, "project")` |
| `date()` / `dateformat()` | `date(due) >= date("2026-01-01")` |
| Aggregation | `length(tags) > 1`, `min(priority)`, `sum(points)` |

String `=`/`!=` comparisons and `contains()` are case-insensitive. `+` adds
numbers or concatenates strings. Division by zero and unsupported operations
evaluate to `null`. `null`/missing values never satisfy `<`/`>` comparisons.

Supported functions: `contains`, `date`, `dateformat`, `number`, `string`,
`length`, `lower`, `upper`, `trim`, `round`, `floor`, `ceil`, `min`, `max`,
`sum`, `average`, `startswith`, `endswith`, `join`, `reverse`, `sort`,
`default`, `nonnull`, `choice`. Unknown functions render an error block and emit
a diagnostic.

### `FLATTEN`

`FLATTEN` expands an array-valued expression into one row per item. An alias
stored with `AS` is available to later commands and columns:

```dataview
TABLE WITHOUT ID author
FROM #literature
FLATTEN authors AS author
SORT author asc
```

### `SORT`

`SORT` accepts a comma-separated list of expressions with an optional direction
(`asc`, the default, or `desc`). Rows with a missing field sort last.

```text
SORT priority desc, file.name asc
```

### `GROUP BY`

`GROUP BY <expression> [AS name]` groups the rows. Each group is headed by the
group value; `LIST` and `TASK` render one list per group, and `TABLE` inserts a
group row. Groups keep the order established by the preceding commands.

### `LIMIT`

`LIMIT <n>` caps the number of rows at the point where the command appears. It
can also be set for every block with the `limit` option, which then applies when
a block has no `LIMIT`.

## Inline fields

Dataview inline fields are read from each note's Markdown source, so the vault
does not need to change:

```md
status:: active
priority:: 3
due:: 2026-11-10
```

Bracketed fields attach metadata to the surrounding sentence, list item, or
task:

```md
I would rate this a [rating:: 9]!
- [ ] Send the invoice [due:: 2026-11-10].
```

Values follow YAML-like typing: `true`/`false` become booleans, numbers become
numbers, `YYYY-MM-DD` becomes a date, `[a, b]` becomes a list, and quoted values
stay strings. Inline fields take precedence over frontmatter with the same
name, and a later inline field overrides an earlier one. Field names are
queryable with their sanitized form (lowercase, spaces replaced by `-`).

## Task fields

Task rows expose Dataview's implicit fields: `status`, `checked`, `completed`,
`fullyCompleted`, `text`, `visual`, `line`, `lineCount`, `path`, `section`,
`tags`, `outlinks`, `children`, `link`, `task`, `annotated`, `parent`, and
`blockId`. Tasks inherit page fields and may add bracketed inline fields.

Tasks plugin date shorthands (`🗓️`, `✅`, `➕`, `🛫`, `⏳`) are read into `due`,
`completion`, `created`, `start`, and `scheduled`. Priorities and recurrence
are not supported.

## Fields

`file.*` fields: `file.name` (file name), `file.title`, `file.slug`,
`file.path`, `file.folder`, `file.link`, `file.permalink`, `file.url`,
`file.tags`, `file.etags`, `file.inlinks`, `file.outlinks`, `file.size`,
`file.ctime`, `file.mtime`, `file.date`, `file.created`, `file.updated`, and
`file.published`. Frontmatter keys are read directly by name (`status`,
`priority`, `due`, ...).

## Static build time

`today` and `now` use the build clock. One build resolves it once, so every
block in that build agrees. `today` is midnight UTC of the build time. Pass
`publishingBuildTime` to `ContentManager` (or set it in the build pipeline) for
reproducible output:

```ts
new ContentManager(source, [], {
  config,
  plugins: [dataview()],
  publishingBuildTime: "2026-11-01T00:00:00.000Z",
});
```

Results are fixed at build time. Links produced by a dataview block are not
added to the content graph (backlinks).

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `className` | `string` | `"rb-dataview"` | Root CSS class |
| `language` | `string` | `"dataview"` | Fence language to target |
| `hideFallback` | `boolean` | `false` | Hide the raw-query `<details>` fallback |
| `limit` | `number` | none | Default `LIMIT` when a block omits one |
| `localeMode` | `"current" \| "fallback" \| "all"` | `"current"` | Locale selection for query rows |

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

## Compatibility

| Feature | Obsidian support | Riebeckite support | Notes |
| ------- | ---------------- | ------------------ | ----- |
| `LIST`, `TABLE`, `TASK`, `CALENDAR` | Supported | Full | |
| `FROM` by tag, folder, link | Supported | Full | Tags include subtags |
| `FROM` by file path | Supported | Full | |
| `WHERE` boolean/comparison | Supported | Full | |
| Arithmetic and list literals | Supported | Full | |
| Core functions | Supported | Partial | Common numeric, string, list, and date functions; no lambdas |
| Inline fields | Supported | Full | `Key:: value`, `[Key:: value]`, `(Key:: value)` |
| Frontmatter fields | Supported | Full | |
| `TASK` per-task filtering | Supported | Full | |
| `TASK` field shorthands | Supported | Partial | Date shorthands only; no priority or recurrence |
| `FLATTEN` | Supported | Full | |
| `WITHOUT ID` | Supported | Full | |
| Command order and duplicates | Supported | Full | |
| `SORT` / `GROUP BY` expressions | Supported | Full | |
| `rows` field swizzling | Supported | Unsupported | Not exposed to expressions |
| DataviewJS | Supported | Unsupported | Intentional |
| Inline field rendering | Obsidian renders the value | Different | Riebeckite leaves the source text as Markdown |
| `file.tags`-style implicit lists | Supported | Partial | `file.tasks`, `file.lists`, and similar are not populated |

## Exports

- `dataview(options?)` — plugin factory
- `remarkDataview(options?)` — remark transform usable on its own
- `parseDataview(source)` — parse a block body into a `DataviewSpec`
- `parseExpression(source)` — parse a standalone DQL expression
- `parseInlineFields(markdown)` / `parseInlineFieldText(text)` — inline fields
- `parseDataviewTasks(markdown)` — task extraction
- `selectDataviewEntries(spec, manifest, defaultLimit, options?)` — matching engine
- `evaluateDataviewExpression(expression, scope)` and
  `matchesDataviewFrom(from, entry, manifest)` — expression helpers
- `renderDataview(selection, spec, options, source, context?)` — HTML renderer
- `resolveDataviewOptions(options?)` — normalise plugin options
- `DATAVIEW_ATTRIBUTE` — placeholder attribute name
- Types: `DataviewOptions`, `DataviewSpec`, `DataviewQueryType`,
  `DataviewExpression`, `DataviewFrom`, `DataviewRow`, `DataviewTask`, and
  friends

## See also

- [Plugin guide](../reference/plugin-api.md)
- [Obsidian Dataview documentation](https://blacksmithgu.github.io/obsidian-dataview/)
