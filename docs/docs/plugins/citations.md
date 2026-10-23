---
date: 2026-10-06
title: Citations
---
# Citations

[日本語版](./citations.ja.md)

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

## Bibliography page

Setting `pagePath` generates a standalone bibliography page. It is opt-in and
disabled when omitted:

```ts
citations({ bibliography: "references.bib", pagePath: "/bibliography" })
```

The page type (`citations-bibliography`) collects references from two sources:

- the plugin's `bibliography` option, resolved from the content root
- the frontmatter `bibliography` of every discoverable (public) page

Only `manifest.discoverableEntries` contribute frontmatter bibliographies. Pages
that are draft, unlisted, scheduled, or otherwise non-discoverable are ignored,
so their bibliographies are never leaked into the page.

Entries from all files are merged in a deterministic order. Identical duplicates
are dropped silently; when the same key appears with different content, the first
definition wins and the conflict is reported as `citation-duplicate-key`. Missing
files and malformed files are reported as `citation-missing-bibliography` and
`citation-malformed-bibliography`. When no entry is collected, no page is
generated. If a Markdown page or redirect already owns the path, Markdown wins
and the page is skipped with a `citations-page-conflict` diagnostic.

The page body provides its own `<main>` and `<h1>`, escapes all entry text, and
lists entries sorted by key. A `url` or `doi` field becomes a link only when it
resolves to a safe `http(s)` target. Existing in-page citations and the
`References` section are unchanged.

Bibliography pages declare a `global` output dependency, so changes to a
bibliography file, a frontmatter `bibliography`, page visibility, or `pagePath`
invalidate the affected output.

## Options

| Option | Default | Description |
| ------ | ------- | ----------- |
| `bibliography` | unset | Vault-relative BibTeX/BibLaTeX file path or paths |
| `referencesHeading` | `"References"` | Heading inserted above generated references |
| `pagePath` | unset | Path of the standalone bibliography page; disabled when omitted |

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
