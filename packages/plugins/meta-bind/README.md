# @riebeckite/plugin-meta-bind

<!-- Generated from docs/docs/plugins/meta-bind.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Renders a safe, browser-state-only compatibility subset of [Obsidian Meta Bind](https://www.moritzjung.dev/obsidian-meta-bind-plugin-docs/).

[日本語](./README_ja.md)

## Installation

```ts
import { defineConfig } from "@riebeckite/core";
import { metaBind } from "@riebeckite/plugin-meta-bind";

export default defineConfig({
  plugins: [metaBind()],
});
```

## Supported syntax

Inline input fields and views use the same Markdown form as Meta Bind.

```md
Progress: `INPUT[slider(minValue(0), maxValue(10), stepSize(1)):progress]`

Double progress: `VIEW[{progress} * 2]`
```

The initial value comes from frontmatter. Interactions update page-local Reader State only; Riebeckite never writes Markdown files or frontmatter.

```md
---
done: false
priority: 2
---

`INPUT[toggle:done]` `INPUT[number(minValue(1), maxValue(5)):priority]`
`VIEW[{done} && {priority} >= 3]`
```

Use a `meta-bind` code block for multiple fields or a select.

````md
```meta-bind
INPUT[select(option(low), option(high)):priority]
VIEW[{priority}]
```
````

Supported inputs are `text`, `number`, `slider`, `toggle`, and block-only `select`. Supported expressions use same-page `{property}` references, literals, parentheses, `!`, `-`, arithmetic, comparison, equality, `&&`, and `||`.

## Boundaries

Only simple same-page frontmatter paths such as `status` and `task.done` are supported. Cross-note targets, storage and memory targets, bracket paths, button actions, JavaScript views, view write-back, Obsidian commands, and file writes remain literal Markdown and produce a build diagnostic.

The generated HTML contains only the frontmatter values referenced by a field. Values are escaped, expressions are parsed without `eval` or `Function`, and evaluation has depth and step limits. Without JavaScript, inputs retain their initial value and views show their initial result.

The browser module is loaded only on pages that contain a Meta Bind field and is remounted through the page lifecycle after SPA navigation.

## Exports

- `metaBind()` — plugin factory
- `parseMetaBind(source, inline?)` — safe compatibility parser
- `remarkMetaBind()` — Markdown transform
- `initMetaBind(context)` — browser initializer
- `MetaBindModel`, `MetaBindParseResult` — types

## See also

- [Plugin guide](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.md)
