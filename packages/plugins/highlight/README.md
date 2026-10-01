# @riebeckite/plugin-highlight

Inline `==highlight==` support. Text wrapped in double equals is rendered as a
`<mark>` element at build time.

[日本語](./README_ja.md)

## Overview

`highlight()` registers a remark transformer that rewrites `==text==` in
Markdown text nodes into raw HTML before the tree is converted to HTML. It
complements `remark-gfm` (which only understands `~~strikethrough~~`).

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { highlight } from "@riebeckite/plugin-highlight";

export default defineConfig({
  // ...
  plugins: [highlight()],
});
```

## Syntax

```md
This sentence has a ==highlighted phrase== inside it.
```

Output:

```html
This sentence has a <mark class="rb-highlight">highlighted phrase</mark> inside it.
```

Highlights are matched non-greedily, must stay on a single line, and are
ignored when they are empty or contain only whitespace. Matches inside code
blocks, inline code, raw HTML, and frontmatter are left untouched.

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `className` | `string` | `"rb-highlight"` | CSS class on each generated element |
| `tag` | `string` | `"mark"` | HTML tag used for the highlight |

```ts
highlight({ className: "my-highlight", tag: "span" });
```

## Styling

The package ships `style.css`, exposed as
`@riebeckite/plugin-highlight/style.css`. The default rule styles
`.rb-highlight` with a subtle accent background and falls back to the
`--rb-color-accent` theme variable when available:

```css
.rb-highlight {
  --rb-highlight-accent: var(--rb-color-accent, #f6d365);
  padding: 0.05em 0.25em;
  border-radius: 0.2em;
  background: color-mix(in srgb, var(--rb-highlight-accent) 45%, transparent);
  color: inherit;
}
```

Because the plugin registers a style asset, the host site includes this
stylesheet automatically; override the class or supply your own CSS to change
the appearance.

## Limitations

- A highlight never spans multiple text nodes or lines, so `==` delimiters
  cannot wrap other Markdown (links, emphasis, code) or line breaks.
- Nested highlights are not supported; the innermost `==` pair wins.
- The transformer emits raw HTML, so enable raw HTML output in the pipeline
  (the default Riebeckite pipeline does).

## Exports

- `highlight(options?)` — plugin factory
- `highlightPlugin` — alias of `highlight`
- `remarkHighlight(options?)` — the underlying remark transformer
- Type: `HighlightOptions`

## See also

- [Plugin guide](../../../docs/en/docs/reference/plugin-api.md)

