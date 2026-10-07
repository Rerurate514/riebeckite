<!-- Generated from packages/plugins/citations/README.md. Do not edit this page directly; edit the package README and run `pnpm docs:sync`. -->

# Citations

[日本語版](./citations.md)

Official Riebeckite plugin for BibTeX / BibLaTeX based citations in Markdown and Obsidian notes.

```ts
import { citations } from "@riebeckite/plugin-citations";

export default {
  plugins: [
    citations({ bibliography: "references.bib" }),
  ],
};
```

## Supported citation syntax

The plugin implements a stable Pandoc-inspired subset:

- `[@smith2024]`
- `[@smith2024; @doe2025]` — multiple keys must be separated by `;`
- `@smith2024 argues that ...`
- `[-@smith2024]` — suppress-author input
- `[@smith2024, p. 42]` and `[see @doe2025]` — prefix and suffix are kept, rendering as `[1, p. 42]` and `[see 2]`

Repeated citations reuse the first number assigned to that key. Under numeric labels, `[-@smith2024]` renders the same label as `[@smith2024]`.

Inline `@key` must be preceded by the start of the text, whitespace, or `(`. Text attached directly to `@key` on the left — for example `本文@smith2024` — is not recognized; write `[@smith2024]` instead.

Riebeckite parses `:name` as a directive before this plugin runs. When that split breaks a citation key, the plugin reassembles it, so `[@colon:2024]` and `@colon:2024 argues` both work. Keys may contain letters, digits, `-`, `_`, `:`, and `.`.

Not transformed: inline code, fenced code blocks, HTML, frontmatter, normal Markdown links (at any nesting depth), and Obsidian WikiLinks.

## Bibliography files

- `citations({ bibliography })` paths are relative to the content root.
- Frontmatter `bibliography` is resolved relative to the page first, then to the content root. Both `/` and `\` separators are accepted and `../` is normalized inside the string; every candidate still goes through the content source, so nothing outside the configured content root can be read.
- The bibliography file is read at build time only. It is never copied into the output and absolute paths never appear in generated files.

## Supported bibliography subset

Curated entry types are `article`, `book`, `inproceedings`, and `misc`. Other entry types are still parsed and rendered with generic fields, and reported as `citation-unsupported-entry-type`.

`@comment`, `@preamble`, and `@string` entries are accepted and skipped. Malformed entries report `citation-malformed-bibliography` and parsing resumes at the next `@`, so one broken entry does not discard the rest of the file.

Supported syntax: multiline fields, quoted and braced values, nested braces, commas inside values, escaped characters, trailing commas, whitespace and CRLF.

Reported through `citation-unsupported-bibliography-syntax` instead of failing silently:

- `@string` macro references are rendered literally; they are not expanded.
- `#` string concatenation keeps only the first part.

## References section

Pages with citations receive a `References` heading and an ordered list at the end of the Markdown body. Each entry carries an `id` of the form `ref-<sanitized key>`, where characters outside `[A-Za-z0-9_-]` are replaced by `-` and collisions get a deterministic numeric suffix. Citation labels link to that anchor.

Use `referencesHeading` for localized headings:

```ts
citations({ bibliography: "references.bib", referencesHeading: "参考文献" })
```

## Diagnostics

Reported through Riebeckite diagnostics:

- `citation-unknown-key`
- `citation-missing-bibliography`
- `citation-malformed-bibliography`
- `citation-duplicate-key`
- `citation-unsupported-entry-type`
- `citation-unsupported-bibliography-syntax`

Citation numbering, reference ordering, generated HTML, and diagnostics are deterministic: identical input produces identical output.

## License

Apache-2.0
