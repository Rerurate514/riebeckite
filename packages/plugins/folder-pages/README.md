# @riebeckite/plugin-folder-pages

Folder Page support for Riebeckite. The plugin turns folder entry notes into the
folder's landing page and generates a listing page for folders that have no
entry note.

## Installation

```bash
pnpm add @riebeckite/plugin-folder-pages
```

## Usage

```ts
import { folderPages } from "@riebeckite/plugin-folder-pages";

export default {
  plugins: [folderPages()],
};
```

## Markdown-backed Folder Pages

A note at `<folder>/README.md` or `<folder>/index.md` becomes the folder's
landing page. Its resolved permalink is collapsed from `/folder/README` or
`/folder/index` to `/folder/`, and the old URL redirects to the new one.

The collapse never guesses a URL from the slug. It rewrites the permalink that
the location resolver already produced, so localized and custom permalinks stay
correct.

Only `README` and `index` are treated as folder entries. A note at
`<folder>.md` stays a normal content page.

When a folder contains both `README.md` and `index.md`, neither is collapsed:
the choice would be ambiguous, so the plugin leaves both notes at their default
locations.

## Generated Folder Pages

Folders without a markdown entry note but with discoverable content get an
automatically generated page at `/folder/`. The page lists only the folder's
direct children:

- **Pages**: direct public, discoverable notes.
- **Folders**: direct subfolders that contain discoverable content.

The listing is built from `manifest.discoverableEntries`, so unlisted, draft,
and scheduled notes never appear. Notes reachable only by URL stay hidden from
the navigation. The `folder.md` case is never confused with a folder entry.

## Ordering

Pages and folders are sorted by their resolved permalink, then by title, so the
output is deterministic regardless of plugin order.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `className` | `string` | `"rr-folder-page"` | Root CSS class for the rendered fragment. |
| `pagesLabel` | `string` | `"Pages"` | Heading for the page list. |
| `foldersLabel` | `string` | `"Folders"` | Heading for the folder list. |

## Plugin dependencies

The plugin declares an optional dependency on the `content.localization`
capability. When `@riebeckite/plugin-l10n` is enabled, the folder page location
rewrite runs after localization so the collapsed URLs and redirects use the
final, localized permalinks. Without l10n, the plugin still works on its own.
