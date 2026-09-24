# @riebeckite/plugin-diff

Git-backed diff and revision history for Markdown notes: read commit history,
retrieve past revisions, and compute line-level diffs between them.

[日本語](./README_ja.md)

## Overview

`createPostDiffApi()` wraps a local Git repository and exposes revision
history plus line diffs for any Markdown file, even when the note was renamed
or moved (`git log --follow`). `createLineDiff()` is the pure diff engine used
by the API and is also exported for standalone use.

The `diff()` plugin registers a `diff` entry in the plugin list; the
programmatic API is the primary interface.

## Usage (plugin)

```ts
import { defineConfig } from "@riebeckite/core";
import { diff } from "@riebeckite/plugin-diff";

export default defineConfig({
  // ...
  plugins: [diff({ cwd: "./content" })],
});
```

`diff(options?)` accepts the same `GitHistoryReaderOptions` as the API.

## Programmatic API

```ts
import { createPostDiffApi } from "@riebeckite/plugin-diff";

const api = createPostDiffApi({ cwd: "./content" });

const history = await api.getHistory("notes/hello.md");
const previous = await api.getRevisionMarkdown("notes/hello.md", history[1].hash);
const current = await api.getCurrentDiff("notes/hello.md");
const compare = await api.compareRevisions({
  filePath: "notes/hello.md",
  fromHash: history[1].hash,
  toHash: history[0].hash,
});
```

- `getHistory(filePath)` — commit history for the file (newest first) as
  `DiffRevision[]`
- `getRevisionMarkdown(filePath, hash)` — Markdown source at a given revision,
  or `null`
- `getCurrentDiff(filePath)` — line diff between the latest revision and its
  predecessor (or from an empty source when there is no predecessor)
- `compareRevisions({ filePath, fromHash, toHash })` — line diff between two
  revisions; `fromHash: null` diffs from an empty source

## Options

`createPostDiffApi(options?)` accepts `GitHistoryReaderOptions`:

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `cwd` | `string` | `process.cwd()` | Working directory for Git commands |

When `cwd` is not inside a Git repository, API calls resolve to empty results
(`[]` / `null`) instead of throwing.

## Types

| Type | Description |
| ---- | ----------- |
| `DiffRevision` | Commit metadata: `hash`, `shortHash`, `date`, `message`, `author` |
| `MarkdownRevision` | `DiffRevision` with the Markdown source |
| `PostDiff` | `from`, `to`, and `lines` |
| `DiffLine` | A single diff line: `{ type, content }` |
| `DiffLineType` | `"context" \| "added" \| "removed"` |
| `RevisionComparisonInput` | `{ filePath, fromHash: string \| null, toHash }` |

## Exports

- `diff(options?)` — plugin factory
- `createPostDiffApi(options?)` — programmatic API factory
- `createLineDiff(from, to)` — LCS-based line diff
- `GitMarkdownHistoryReader` — Git-backed history reader class
- Types listed above

## See also

- [Plugin guide](../../docs/plugins_en.md)