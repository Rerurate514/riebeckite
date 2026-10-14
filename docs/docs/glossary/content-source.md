---
title: Content Source
sidebar:
  hidden: true
---

# Content Source

The abstraction that discovers and reads content for the rest of the pipeline. The standard implementation reads a filesystem or an Obsidian vault, so the Content Manager never walks the filesystem directly.

## The read side of the pipeline

A content source owns scanning and reading. It returns raw entries with their paths and bytes; parsing and location resolution happen later.

Because reading is behind an interface, the same build can read a local directory, an Obsidian vault, or another source without changing the Content Manager.

## Why it is separate

Keeping acquisition separate means caching and [incremental builds](./incremental-build.md) can reason about file identity, while processing stays pure over the entries it receives.

## Content source types

The standard implementation is `FileSystemContentSource` (`packages/core/src/content/file_system_content_source.ts`), which scans a directory tree and reads files via the `ContentSource` interface. Custom sources can implement the same interface to read from an Obsidian vault, cloud storage, or any other filesystem-like source without changing the Content Manager.

The `ContentSource` interface (`packages/core/src/content/content_source.ts`) defines:

- **`scan()`** — returns `Promise<readonly ContentSourceEntry[]>`, each entry having a `path` and optional `metadata` (modified, size, etag, hash)
- **`read(entry)`** — returns `Promise<ContentSourceContent>`, the raw file bytes or text

Example `ContentSourceEntry`:

```ts
{
  path: "content/notes/hello.md",
  metadata: {
    modifiedAt: 1700000000000,
    size: 42,
    etag: '"abc123"',
    hash: "sha256:xyz..."
  }
}
```

Example minimal custom content source:

```ts
const mySource: ContentSource = {
  async scan() {
    // Return entries for each file to process
    return [{ path: "my/path.md" }];
  },
  async read(entry) {
    // Read the file content (string or Uint8Array)
    return await fs.promises.readFile(entry.path, "utf8");
  }
};
```

## Related terms
