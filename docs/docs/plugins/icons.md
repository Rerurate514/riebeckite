---
date: 2026-10-24
title: Icons
---
# Icons

[日本語](./icons.ja.md)

Reads the icons you already configured in Obsidian Iconize and Iconic and
renders them on the static site. Icons are resolved once at build time and
passed to navigation, folder pages, search, article headers, tag listings, and
property panels as structured data.

## Installation

```bash
pnpm add @riebeckite/plugin-icons
```

## Usage

```ts
import { icons } from "@riebeckite/plugin-icons";

export default {
  plugins: [icons()],
};
```

No configuration is required. The plugin looks for
`.obsidian/plugins/obsidian-icon-folder/data.json` and
`.obsidian/plugins/iconic/data.json` in the Obsidian vault. When the content
directory is a subdirectory of the vault, its vault-relative prefix is inferred
automatically.

## Where icons appear

- navigation items and folder-only navigation entries
- generated folder pages and their page/folder lists
- the article title, when the note has a file icon
- search results
- tags in the article metadata and taxonomy tag pages
- property keys in the properties panel

Inline icons in Markdown are rendered wherever prose is rendered: headings,
paragraphs, lists, tables, and blockquotes. Code blocks, inline code, links,
URLs, raw HTML, and escaped colons are left untouched.

## Iconize

Supported settings and data:

- file and folder icons keyed by vault-relative path
- custom rules with order, basename or full-path matching, color, and the
  `everything` / `files` / `folders` scope
- frontmatter icons and colors, including custom field names
- inline icons using the configured identifier (default `:`)
- Lucide icons such as `LiRocket`
- folder-based custom icon packs under the configured icon packs directory
- per-icon colors, rule colors, and the global icon color

A direct path entry wins over a custom rule, matching Iconize. Rules are
evaluated in ascending `order`; invalid regular expressions fall back to a
substring match. Literal emoji values are rendered as emoji.

## Iconic

Supported settings and data:

- file and folder icons keyed by vault-relative path
- `fileRules` and `folderRules`
- rule icons and colors, including the nine named theme colors
- `tagIcons` and `propertyIcons`
- conditions for name, filename, extension, tree, path, tags, properties,
  links, embeds, created, and modified
- `is`, `contains`, `startsWith`, `endsWith`, `matches`, `hasValue`,
  `hasProperty`, boolean and numeric operators, array operators, `!` negation,
  and `all` / `any` / `none` groups

Iconic rules are evaluated in array order and the first enabled match wins. A
matching rule overrides a manually assigned file icon, as it does in Obsidian.

## Inline icons

The default syntax is `:name:`.

- `:rocket:`, `:smile:`, `:warning:`, and `:book:` resolve to emoji.
- An unknown emoji name falls back to the Lucide icon with the same name.
- `:LiRocket:` resolves a Lucide icon directly.
- A custom pack prefix such as `:MyPackRocket:` resolves the pack icon.
- Unknown names stay as literal text.

Icons inherit the surrounding font size and color. When no color is configured
they use `currentColor`, so light and dark themes work without extra CSS. Icons
are decorative and marked `aria-hidden="true"` so screen readers do not
announce them twice.

## Precedence

When more than one source has an icon, the default order is:

1. explicit `overrides` option
2. note frontmatter
3. Iconic
4. Iconize

The order is configurable. Inside each source, the upstream rules still apply:
Iconize uses direct entry before custom rule, and Iconic uses the first matching
rule before the manual icon.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `sources` | `("iconize" \| "iconic")[]` | both | Icon sources to read. |
| `inline` | `boolean` | `true` | Resolve inline icon syntax in Markdown. |
| `frontmatter` | `boolean` | `true` | Read icons from note frontmatter. |
| `colors` | `boolean` | `true` | Apply configured icon colors. |
| `precedence` | `("config" \| "frontmatter" \| "iconic" \| "iconize")[]` | `["config", "frontmatter", "iconic", "iconize"]` | Source order for a single icon. |
| `overrides` | `Record<string, string \| { icon: string; color?: string }>` | `{}` | Explicit icons keyed by vault path or slug. |
| `vaultRoot` | `string` | auto-detected | Obsidian vault root. |
| `vaultPrefix` | `string` | inferred | Vault-relative prefix of the content directory. |
| `iconize` | `{ enabled?, dataFile?, iconPacks? }` | auto | Iconize overrides. |
| `iconic` | `{ enabled?, dataFile? }` | auto | Iconic overrides. |

Example for a vault and site that live in separate repositories:

```ts
icons({
  vaultRoot: "../notes",
  vaultPrefix: "content/",
  iconize: { dataFile: "../notes/.obsidian/plugins/obsidian-icon-folder/data.json" },
  iconic: { dataFile: "../notes/.obsidian/plugins/iconic/data.json" },
});
```

Explicit data files must stay inside the vault root (or the working directory
when no vault root is set).

## Supported icon packs

Lucide is read on demand from `lucide-static`; only icons that are actually
referenced are emitted. Folder-based Iconize packs are read from the configured
icon packs directory. Zip-only packs are not read; extract them into folders
under that directory. Iconize's `twemoji` emoji style is not bundled, so native
emoji are used instead.

## Unsupported and constrained behavior

- Iconic `clock`, `headings`, `bookmarks`, and now-relative date/time conditions
  cannot be evaluated during a static build. They never match, and a diagnostic
  explains why. Absolute date comparisons on `created` and `modified` work when
  file metadata is available.
- Iconic emoji colors are not reproduced with CSS filters; emoji render in the
  platform's native colors.
- Obsidian UI icons (ribbon, tabs, menus, bookmarks) are intentionally ignored.
- Icons for unpublished notes are not emitted into public HTML.
- A missing or malformed settings file is reported as a warning and never fails
  the build.

## Security

The plugin reads only the known Obsidian settings files and the configured icon
packs directory. It does not execute plugin JavaScript, does not copy
`.obsidian` into the output, and does not scan the vault for arbitrary files.
Settings and pack paths are restricted to the vault root, symlinks are skipped,
and file sizes are capped.

Custom SVG and Lucide SVG pass through an allowlist sanitizer that removes
scripts, event handlers, styles, external references, and unsafe URL schemes
before any HTML is emitted. No client-side JavaScript renders icons.
