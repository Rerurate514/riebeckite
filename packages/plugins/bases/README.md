# @riebeckite/plugin-bases

Render Obsidian Bases definitions from fenced `base` code blocks. Filtering,
sorting, and view composition run against the content manifest at build time, so
no client-side JavaScript is required.

[日本語](./README_ja.md)

## Overview

`bases()` recognises fenced blocks

````md
```base
filters:
  and:
    - file.hasTag("featured")
properties:
  file.name:
    displayName: Title
  file.tags:
    displayName: Tags
views:
  - type: table
    name: Featured
    order:
      - file.name
      - file.tags
    limit: 10
```
````

and renders them using the content manifest (every note's frontmatter, tags,
links, and permalink).

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { bases } from "@riebeckite/plugin-bases";

export default defineConfig({
  // ...
  plugins: [bases()],
});
```

## Block syntax

The block body is an Obsidian Base YAML document.

| Field | Type | Description |
| ----- | ---- | ----------- |
| `filters` | expression \| list \| object | Top-level filter applied to every view (below) |
| `properties` | object | Property id -> display name (or `{ displayName }`) |
| `views` | object[] | One or more views |

### Views

| Field | Type | Description |
| ----- | ---- | ----------- |
| `type` | `"table"` \| `"cards"` | Output kind. Defaults to `table` |
| `name` | string | Optional label rendered above the view |
| `filters` | filter | Additional filter, combined with the top-level filter using AND |
| `order` | string \| string[] | Columns (property ids) and their display order |
| `columns` | string \| string[] | Alias for `order` |
| `sort` | object \| object[] \| string | Sort keys (below) |
| `limit` | number | Row cap for this view; still bounded by the `limit` option |

`sort` accepts the Core shape `{ field, order }`, the Obsidian shape
`{ property, direction }`, or a shorthand string (`"-file.name"` sorts
descending). When a view omits `order`/`columns`, the columns are the keys of
`properties` (in order), or `["file.name", "file.tags"]`.

### Filter grammar

A filter is an expression string, a list of expressions (treated as AND), or an
object with `and` / `or` / `not` keys. `and` and `or` take a list; `not` takes an
expression or a list (the list is ANDed, then negated). A plain object whose keys
are property names is treated as equality.

| Expression | Description |
| ---------- | ----------- |
| `file.hasTag("x")` | Has the tag `x` (or a subtag `x/...`). Case-insensitive |
| `file.inFolder("x")` | Slug equals `x` or starts with `x/` |
| `file.hasLink("x")` | Links to `x` (by resolved slug, raw target, or file name) |
| `file.name` / `file.title` | Note title |
| `file.path` / `file.slug` | Slug |
| `file.folder` | Parent folder of the slug |
| `file.link` / `file.permalink` | Permalink |
| `file.tags` | Tags |
| `note.key` / `key` | A frontmatter value |

Comparisons use `==`, `!=`, `>`, `<`, `>=`, `<=`, and `contains`. String
comparisons are case-insensitive; `contains` tests array membership or substring
containment. Bare scalar lists are ANDed.

```yaml
filters:
  and:
    - file.hasTag("featured")
    - or:
        - note.status == "published"
        - note.status == "review"
    - not:
        - file.hasTag("draft")
views:
  - type: table
    name: Featured
    order: [file.name, note.status]
    sort:
      - property: file.name
        direction: ASC
    limit: 20
```

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `className` | `string` | `"rb-bases"` | Root CSS class |
| `language` | `string` | `"base"` | Fence language to target |
| `limit` | `number` | `100` | Global row cap applied to every view |
| `showFallback` | `boolean` | `true` | Render the raw Base definition in a `<details>` fallback |
| `view` | `string` | none | Render only the view with this name when a Base defines several |

## Output HTML / CSS hooks

```html
<div class="rb-bases" data-bases data-bases-view="table">
  <section class="rb-bases__view" data-bases-view="table">
    <h3 class="rb-bases__view-name">Featured</h3>
    <table class="rb-bases__table"> ... </table>
  </section>
  <details class="rb-bases__fallback"> ... </details>
</div>
```

Stable classes: `rb-bases`, `rb-bases__view`, `rb-bases__view-name`,
`rb-bases__table`, `rb-bases__heading`, `rb-bases__cell`, `rb-bases__row`,
`rb-bases__link`, `rb-bases__tags`, `rb-bases__tag`, `rb-bases__cards`,
`rb-bases__card`, `rb-bases__card-title`, `rb-bases__fields`, `rb-bases__field`,
`rb-bases__field-label`, `rb-bases__field-value`, `rb-bases__empty`,
`rb-bases__fallback`, `rb-bases--error`. Stable attributes: `data-bases`,
`data-bases-view`.

## Diagnostics

A block that is not valid YAML, or that uses an unsupported filter expression or
view shape, is left as a code block and reported through `file.message(...)` with
`source: "@riebeckite/plugin-bases"`.

## Limitations

This is an MVP subset of Obsidian Bases:

- Only the `table` and `cards` view types are rendered.
- Inline boolean operators (`&&`, `||`, `!`) are not supported; use the
  `and` / `or` / `not` YAML structure.
- `if()` / `filter()` and other Base formula functions are not supported.
- Nested property paths and `file.mtime` / `file.ctime` are mapped onto `date`.
- Property-to-property comparisons are not supported; the right-hand side is a
  literal.
- Results are fixed at build time. Rebuilding a host note when a queried note
  changes is future work; a full build always recomputes correctly.

## Exports

- `bases(options?)` — plugin factory (alias: `basesPlugin`)
- `remarkBases(options?)` — remark transform usable on its own (`options.language`
  selects the fence language)
- `parseBases(document)` — compiles a parsed YAML Base document to a spec
- `matchesCondition(condition, entry)` — condition evaluator
- Types: `BasesOptions`, `BasesSpec`, `BasesView`, `BasesViewType`,
  `BasesCondition`, `BasesValueRef`, `BasesBuiltinValue`, `BasesOperator`,
  `BasesLiteral`

## See also

- [Plugin guide](../../../docs/en/docs/reference/plugin-api.md)

