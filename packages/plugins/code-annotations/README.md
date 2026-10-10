# @riebeckite/plugin-code-annotations

<!-- Generated from docs/docs/plugins/code-annotations.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Renders code diffs with the language syntax highlighter and Riebeckite's code
block UI.

[日本語](./README_ja.md)

## Installation

```ts
import { defineConfig } from "@riebeckite/core";
import { codeAnnotations } from "@riebeckite/plugin-code-annotations";

export default defineConfig({
  plugins: [codeAnnotations()],
});
```

Use it with `@riebeckite/plugin-code-enhance` to retain syntax highlighting,
line numbers, the language label, and copy controls.

## Syntax

Use `diff` as the fence language and put the target language after it. Lines
starting with `+` are additions, lines starting with `-` are removals, and all
other lines are unchanged.

````md
```diff js
+ const message = "Hello";
- const message = "World";
const unchanged = true;
```
````

The `+` and `-` markers are rendered separately from the code, so Shiki
highlights the JavaScript, TypeScript, Python, JSON, or other target language
without treating the marker as source code. The copy button copies the visible
diff, including its markers.

An empty, malformed, or missing target language leaves the fence as an ordinary
`diff` code block. A target language that the syntax highlighter does not know
falls back to its normal unhighlighted rendering and does not fail the build.

## Integration

The plugin transforms Markdown in its remark phase, records each line marker in
fence metadata, then restores the markers and the existing
`rr-code__line--add` / `rr-code__line--remove` classes in its rehype phase.
`code-enhance` supplies the line wrappers and all code block UI. The plugin does
not import it, so the two packages remain independently configurable.

## Exports

- `codeAnnotations()` / `codeAnnotationsPlugin()` — plugin factory
- `remarkCodeAnnotations()` — Markdown transform
- `rehypeCodeAnnotations()` — HTML transform
- `collectCodeDiff(code)` — separates diff markers from source text
- `serializeCodeDiff(plan)` / `deserializeCodeDiff(value)` — line-plan helpers
- `encodeCodeDiffMeta(plan)` / `extractCodeDiffMeta(meta)` — metadata helpers
- Types: `CodeDiffPlan`, `DiffMarker`

## See also

- [Plugin guide](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.md)
- [`@riebeckite/plugin-code-enhance`](../code-enhance/README.md)
