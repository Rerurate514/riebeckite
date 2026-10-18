# @riebeckite/plugin-bases

<!-- Generated from docs/docs/plugins/bases.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Render a compatible, build-time subset of Obsidian Bases. `bases()` supports both
fenced `base` blocks and referenced `.base` documents; no client-side evaluator
is shipped.

[日本語](./README_ja.md)

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
properties:
  file.name: File
  formula.label: Label
views:
  - type: table
    name: Books
    order: [file.name, formula.label]
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

Supported functions: `if`, `list`, `number`, `min`, `max`, `date`; string
`lower`, `upper`, `contains`, `startsWith`, `endsWith`, `trim`, `split`,
`replace`; list `contains`, `join`, `unique`, `flat`, `sort`; number `round`,
`floor`, `ceil`, `abs`, `toFixed`; and `file.hasTag`, `file.hasLink`,
`file.inFolder`.

## Compatibility matrix

| Obsidian Base feature | Status | Notes |
| --- | --- | --- |
| YAML root, `filters`, `properties`, `formulas`, `views` | Supported | Invalid YAML/specs produce a diagnostic. |
| Table and cards | Supported | Other view types are not rendered. |
| AST filters and formulas | Supported subset | See the function list above. |
| Formula sorting, grouping, summaries | Unsupported | Formula values render in columns only. |
| `file.name`, `file.path`, `file.ext`, `file.folder`, `file.tags`, `file.links`, `file.properties`, `file.link` | Partial | Derived from the Markdown manifest; name/path use the `.md` source convention. |
| `file.size`, `file.mtime`, `file.ctime`, backlinks, embeds | Unsupported | Core manifest rows do not carry this metadata. These values are empty, never mapped to frontmatter dates. |
| Date/list lambda and higher-order functions, regex, links/images | Unsupported | They are rejected or evaluate to an empty value. |

## Options and exports

`className`, `language`, `limit`, `showFallback`, and `view` retain their existing
meanings. The package exports `bases`, `basesPlugin`, `remarkBases`, `parseBases`,
`parseBasesExpression`, `evaluateBasesExpression`, `matchesCondition`, and the
public Bases types.
