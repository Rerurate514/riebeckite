# Citations

Citations adds BibTeX / BibLaTeX based references to Markdown and Obsidian notes.

## Installation

```bash
npm install @riebeckite/plugin-citations
```

```ts
import { citations } from "@riebeckite/plugin-citations";

export default defineConfig({
  plugins: [citations({ bibliography: "references.bib" })],
});
```

You can also choose a bibliography per page with frontmatter:

```yaml
bibliography: references.bib
```

A frontmatter path is resolved relative to the page first, then to the content root. A config path is always relative to the content root.

## Citation syntax

Riebeckite supports a stable Pandoc-inspired subset:

- `[@smith2024]`
- `[@smith2024; @doe2025]`
- `@smith2024 argues that ...`
- `[-@smith2024]` for suppress-author style input

Prefix and suffix are kept: `[@smith2024, p. 42]` renders as `[1, p. 42]`, and `[see @doe2025]` renders as `[see 2]`. Repeated citations reuse their first number.

Inline `@key` needs a boundary on the left — the start of the text, whitespace, or `(`. If the left side is attached text such as `本文@smith2024`, write `[@smith2024]` instead.

Keys may contain letters, digits, `-`, `_`, `:`, and `.`. A `:` that Riebeckite's directive syntax would otherwise consume is reassembled by the plugin, so `[@colon:2024]` works.

## References

Pages that contain citations receive a References section at the end of the Markdown body. Citation labels link to a stable anchor built from the citation key.

Use `referencesHeading` for localized headings:

```ts
citations({ bibliography: "references.bib", referencesHeading: "参考文献" })
```

## Supported bibliography entries

The curated set is `article`, `book`, `inproceedings`, and `misc`. Other entry types are still read with generic fields and reported as diagnostics. `@comment`, `@preamble`, and `@string` are accepted and skipped.

Multiline fields, quoted and braced values, nested braces, commas inside values, escaped characters, trailing commas, and CRLF line endings are supported. Macro expansion and `#` string concatenation are not; both are reported through diagnostics instead of failing silently.

## Diagnostics

The plugin reports missing bibliography files, malformed bibliography input, duplicate keys, unsupported entry types, unknown citation keys, and unsupported BibTeX syntax through Riebeckite diagnostics.

Inline code, fenced code blocks, HTML, frontmatter, normal Markdown links, and WikiLinks are not transformed.

## Detailed specification

For configuration options, public APIs, constraints, and additional examples, see the [package README](../../../../packages/plugins/citations/README.md). For the overall Plugin architecture, see [Plugin System](../framework/plugin-system.md).

