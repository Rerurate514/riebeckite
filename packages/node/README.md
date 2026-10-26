# @riebeckite/node

[日本語](./README_ja.md)

Node.js adapters for Riebeckite. It provides the filesystem-backed content
source used by Node.js applications and framework integrations.

## Installation

Install this package when your application creates a `ContentManager` from a
directory on disk:

```sh
pnpm add @riebeckite/core @riebeckite/node
```

`@riebeckite/honox` installs and uses this adapter for its default filesystem
content source.

## Use a filesystem content source

`ContentManager` accepts a `ContentSource`. Create a
`FileSystemContentSource` for a local content directory and pass it to the
manager:

```ts
import { ContentManager, defineConfig } from "@riebeckite/core";
import { FileSystemContentSource } from "@riebeckite/node";

const config = defineConfig({
  site: { title: "My notes" },
  content: {
    directory: "content",
    exclude: ["drafts/**"],
  },
});

const content = new ContentManager(
  new FileSystemContentSource(config.content.directory, config.content.exclude),
  [],
  { config, plugins: config.plugins },
);
```

The directory is read when content is scanned or requested, not in the
constructor. A missing directory produces an error that names the directory.

## Filesystem behavior

- Scans directories recursively and returns paths in a stable alphabetical
  order.
- Includes regular files with creation time, modification time, and size
  metadata.
- Reads only regular files. Symbolic links are never followed or exposed.
- Rejects reads outside the configured content directory.
- Ignores Riebeckite and common workspace metadata by default: `.riebeckite`,
  `.git`, `.github`, `.obsidian`, `node_modules`, `.DS_Store`, `Thumbs.db`, and
  `desktop.ini`.
- Applies the configured exclusion patterns. An exclusion without `.md` also
  matches the corresponding Markdown path, so `private` excludes
  `private.md`.
- Reads Obsidian Templater's `templates_folder` setting when present and
  excludes that folder from content.

## Public API

### `FileSystemContentSource`

```ts
new FileSystemContentSource(
  contentDirectory: string,
  exclude?: readonly string[],
)
```

Implements Core's `ContentSource` contract. Use `scan()` for entries and
`read(entry)` for the content of an entry.

`scanWithExclusions()` additionally returns exclusion records:

```ts
const { entries, exclusions } = await source.scanWithExclusions();
```

Each exclusion has the logical `path` and the matching `pattern`. This is
useful for inspection tooling; ordinary applications should use `scan()`.

### Path helpers

- `INTERNAL_CONTENT_IGNORE_PATTERNS` lists the built-in ignored patterns.
- `isIgnoredContentPath(path, exclude?)` reports whether a logical content path
  is ignored.
- `matchContentExcludePattern(path, exclude?)` returns the matching configured
  pattern, if any.

These helpers operate on logical content paths with `/` separators, not
absolute filesystem paths.

## Package boundary

`@riebeckite/core` defines the portable `ContentSource` contract and content
pipeline. This package is the Node.js filesystem implementation of that
contract. Import filesystem-specific APIs from `@riebeckite/node`; do not
import them from `@riebeckite/core`.

## See also

- [`@riebeckite/core`](../core/README.md)
- [Content system](../../docs/docs/framework/content-system.md)
- [Configuration reference](../../docs/docs/reference/configuration.md)
