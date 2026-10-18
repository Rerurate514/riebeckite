---
title: Bases
---
# Bases

Render a compatible, build-time subset of Obsidian Bases. `bases()` supports both
fenced `base` blocks and referenced `.base` documents; no client-side evaluator
is shipped.

[日本語](./bases.ja.md)

## Setup

```ts
import { bases } from "@riebeckite/plugin-bases";

export default { plugins: [bases()] };
```

## `.base` documents and publication

A `.base` file becomes a PageType page at its extensionless path when a routable
Markdown note links to it, for example `![[views/Books.base]]` creates
`/views/Books`. This uses the normal PageType API and does not install custom
routing.

Document-page discovery uses Core's `publicEntries`, so a public or unlisted note
may explicitly expose a referenced Base. Base rows use `discoverableEntries`:
only public notes are listed automatically; unlisted notes remain routable only by
their direct URL. Drafts and scheduled notes are excluded from both. A Base
referenced only from non-public content is not published. Existing Markdown pages
and public redirects win route collisions; the Base page is skipped with a
`bases-invalid` warning.

## Example

```yaml
filters: note.status == "published" && !file.hasTag("hidden")
formulas:
  label: 'note.author.name.upper() + " / " + note.score'
summaries:
  total: values.reduce(acc + value, 0)
properties:
  file.name: File
  formula.label: Label
views:
  - type: table
    name: Books
    order: [file.name, formula.label]
    sort: [{ property: formula.label, direction: DESC }]
    groupBy: { property: note.status, direction: ASC }
    summaries: { formula.label: total }
  - type: cards
    name: Cards
    order: [file.name, formula.label]
```

The same YAML may be placed in a fenced `base` block or in a `.base` file.
Top-level and view-local `filters` are combined with AND. Table and cards are
rendered at build time; all dynamic values are escaped before HTML output.

## Expression and formula subset

Expressions are parsed into an AST and interpreted directly. They never use
`eval`, `Function`, or arbitrary JavaScript execution. Supported syntax includes
literal values and arrays, nested member/index access, `!`, unary `-`, arithmetic,
comparison, `&&`, `||`, parentheses, property-to-property comparisons, and
`formula.name` references. Formula cycles evaluate to an empty value.

Supported functions: `if`, `list`, `length`, `number`, `min`, `max`, `date`; string
`lower`, `upper`, `contains`, `startsWith`, `endsWith`, `trim`, `split`,
`replace`, `reverse`, `repeat`, `slice`, `isEmpty`; list `contains`, `containsAll`,
`containsAny`, `join`, `unique`, `flat`, `sort`, `reverse`, `slice`, `isEmpty`,
`map`, `filter`, `reduce`; number `round`,
`floor`, `ceil`, `abs`, `toFixed`; and `file.hasTag`, `file.hasLink`,
`file.inFolder`.

Formula evaluation is bounded to 10,000 AST steps and 128 nested expressions per
evaluation. Exceeding either limit stops deterministically, reports a
`bases-invalid` diagnostic, and renders the Base error fallback. This prevents
large or deeply nested higher-order expressions from making a static build
unbounded; JavaScript callbacks are never executed.

## File metadata

`file.size` is the source file's byte size. `file.mtime` and `file.ctime` are
UTC `Date` values sourced from the filesystem, so they can be used in properties,
filters, formulas, sorting, grouping, summaries, and higher-order expressions.
Missing or invalid source metadata evaluates to an empty value rather than being
derived from rendered Markdown or build time. Date subtraction returns
milliseconds; a Date can also be offset by a duration such as `"7 days"`.

For filesystem content, `file.ctime` uses Node's `birthtime` value, not
`stat.ctime` (which is a status-change time). Windows normally provides creation
time. Linux filesystems may not expose a creation time; Node can report a
filesystem-dependent fallback or no usable value, so portability-sensitive Bases
should handle an empty `file.ctime`. Cached timestamps retain their UTC instant.

## Incremental builds

Bases records the properties read by filters, formulas, columns, sorting, grouping,
and summaries in the persisted Output Inventory. A change to one of those properties,
to file metadata it reads, or to the discoverable candidate set regenerates only the
Markdown page containing that Base. This includes notes that change from not matching
to matching a filter. Body-only and unrelated frontmatter edits reuse the Base output.

Formula cycles, dynamic property access, and other dependencies that cannot be proven
statically use a conservative per-Base fallback. The fallback never treats an unknown
dependency as no dependency. Draft, scheduled, and unlisted entries remain excluded
from Base rows and are not exposed through cached output.

## Compatibility matrix

| Obsidian Base feature | Status | Notes |
| --- | --- | --- |
| YAML root, `filters`, `properties`, `formulas`, `summaries`, `views` | Supported | Invalid YAML/specs produce a diagnostic. |
| Table and cards | Supported | Other view types are not rendered. |
| AST filters and formulas | Supported subset | See the function list above. |
| Formula sorting and multiple stable sort keys | Supported | Empty values sort last. |
| `groupBy` and `groupOrder` | Supported | Formula properties, empty groups, table, and cards are supported. Interactive collapse is not. |
| Table summaries | Supported subset | Named summaries and Empty, Filled, Unique, Checked, Unchecked, numeric, and date summaries are available. |
| Card summaries | Out of Scope | Obsidian displays summaries in tables, not cards. |
| `file.name`, `file.path`, `file.ext`, `file.folder`, `file.tags`, `file.links`, `file.properties`, `file.link` | Partial | Derived from the Markdown manifest; name/path use the `.md` source convention. |
| `file.size`, `file.mtime`, `file.ctime` | Supported | Byte size, filesystem modification time, and filesystem creation-time equivalent. `ctime` can be unavailable on Linux; it is never mapped from `stat.ctime`, frontmatter, or build time. |
| Backlinks, embeds | Unsupported | These values are empty. |
| List `map`, `filter`, and `reduce` | Supported subset | Their expressions use the `value`, `index`, and `acc` scope with a bounded list size. |
| Incremental dependency tracking | Supported | Tracks filter candidates and AST-derived property dependencies; dynamic or cyclic formulas fall back per Base. |
| Regex, object literals, link/image rendering, nondeterministic date/random functions | Unsupported | Static rendering does not execute JavaScript or emit unsafe URLs. |
| Editing, group collapse, and other interactive view controls | Out of Scope | Riebeckite renders static build output. |

## Options and exports

`className`, `language`, `limit`, `showFallback`, and `view` retain their existing
meanings. The package exports `bases`, `basesPlugin`, `remarkBases`, `parseBases`,
`parseBasesExpression`, `analyzeBasesDependencies`, `evaluateBasesExpression`, `matchesCondition`, and the
public Bases types.
