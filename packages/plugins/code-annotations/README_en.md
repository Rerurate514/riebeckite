# @riebeckite/plugin-code-annotations

VitePress/Docusaurus-style code block annotations: line highlighting, focus,
and diff markers that work on plain `<pre><code>` blocks and on the line
wrappers produced by `@riebeckite/plugin-code-enhance`.

[日本語](./README_ja.md)

## Installation

```ts
import { defineConfig } from "@riebeckite/core";
import { codeAnnotations } from "@riebeckite/plugin-code-annotations";

export default defineConfig({
  // ...
  plugins: [codeAnnotations()],
});
```

The plugin registers its own `style.css`. It adds no client entry and no
runtime JavaScript.

## Syntax

### Line highlighting (fence meta)

Add a brace range after the language, exactly like Docusaurus and VitePress.

````md
```js {2,4-5}
const a = 1;
const b = 2;
const c = 3;
const d = 4;
const e = 5;
```
````

Lines `2`, `4`, and `5` receive `rb-code__line--highlighted`.

### Focus

Use the `focus` meta group, or an inline `[!code focus]` marker. An optional
count focuses the current line and the following lines.

````md
```js focus:{2}
const a = 1;
const b = 2;
```
````

````md
```js
const a = 1; // [!code focus]
const b = 2;
```
````

`.rb-code__line--focused` is applied. `[!code focus:3]` focuses three lines
starting at the marker.

### Diff

````md
```js
const kept = true;
const added = true;    // [!code ++]
const removed = false; // [!code --]
```
````

The marker comment is removed from the rendered text, and the line receives
`rb-code__line--added` or `rb-code__line--removed`.

### Explicit highlight marker

````md
```js
const value = 1; // [!code highlight]
```
````

Marker comments are recognized with the `//`, `#`, `--`, and `<!-- -->`
comment prefixes, so the same syntax works for JavaScript, shell, SQL, Lua,
HTML, and other languages.

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `className` | `string` | `"rb-code"` | Class on the block root (`<pre>` or `rehype-pretty-code` `<figure>`) |
| `lineClassName` | `string` | `"rb-code__line"` | Class on generated line wrappers |
| `highlightClassName` | `string` | `"rb-code__line--highlighted"` | Class for highlighted lines |
| `addedClassName` | `string` | `"rb-code__line--added"` | Class for `[!code ++]` lines |
| `removedClassName` | `string` | `"rb-code__line--removed"` | Class for `[!code --]` lines |
| `focusClassName` | `string` | `"rb-code__line--focused"` | Class for focused lines |
| `language` | `string` | unset | Only annotate blocks of this language |

```ts
codeAnnotations({ highlightClassName: "is-highlighted" });
```

## Using with code-enhance

`@riebeckite/plugin-code-annotations` does not import or depend on
`@riebeckite/plugin-code-enhance`. It detects both raw `<pre><code>` text and
the `.line` wrappers emitted by `rehype-pretty-code`:

- If line wrappers already exist, their classes are extended in place and the
  existing `data-line` attribute is kept.
- Otherwise the plugin wraps the raw code text into
  `<span class="rb-code__line" data-line="N">` elements.

Because `rehype-pretty-code` substitutes the `<code>` element, the plan is also
mirrored into the preserved fence meta, so annotations still apply after
code-enhance runs. Place `codeAnnotations()` after `codeEnhance()` in the
plugins array; the plugin uses `order: 10` to run after code-enhance's
highlighting regardless.

## Exports

- `codeAnnotations(options?)` / `codeAnnotationsPlugin(options?)` — plugin factory
- `remarkCodeAnnotations(options?)` — remark transform
- `rehypeCodeAnnotations(options?)` — rehype transform
- `parseCodeAnnotations(meta)` — parse fence meta into a plan
- `parseLineRanges(spec)` — parse `1,3-5` into line numbers
- `collectCodeAnnotations(meta, code)` — parse meta plus inline markers
- `resolveCodeAnnotationsOptions(options?)` — fill in defaults
- Types: `CodeAnnotationsOptions`, `ResolvedCodeAnnotationsOptions`,
  `CodeAnnotationPlan`, `CodeAnnotationKind`

## See also

- [Plugin guide](../../docs/plugins_en.md)
- [`@riebeckite/plugin-code-enhance`](../code-enhance/README_en.md)
