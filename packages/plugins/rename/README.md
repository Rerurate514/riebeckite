# @riebeckite/plugin-rename

Reduces broken URLs after notes are renamed or moved by turning detected
renames into permanent redirects on the existing Riebeckite redirect
machinery.

[日本語](./README_ja.md)

## Basic usage

```ts
import { defineConfig } from "@riebeckite/core";
import { renamePlugin } from "@riebeckite/plugin-rename";

export default defineConfig({
  plugins: [
    renamePlugin({
      status: 308,
      onUnexpectedRemoval: "warning",
    }),
  ],
});
```

When a note moves, the plugin compares the current routes with the route lock
saved during the previous build. If it can identify the same note, it records a
redirect from the old permalink to the new one in `manifest.redirects`, which
Core already consumes for redirect pages and deploy files.

## How it works

```text
current entries (published only)
        │
        ▼
buildRouteLock ──► current RouteLock
        │                    │
        │                    ▼
        └──────────► diffRoutes(previous, current)
                             │
              ┌──────────────┴───────────────┐
              ▼                              ▼
        rename redirects                diagnostics
        (merged + chain-collapsed)      (ambiguous / removed)
              │
              ▼
     manifest.redirects  ◄── never overwrites an existing key
              │
              ▼
     context.cache "routes.lock"
```

Detection precedence is strict and never fuzzy:

1. **Explicit identity** — the entry's frontmatter `id` matches a lock route's
   `id`.
2. **Exact content hash** — `sha256(entry.html)` matches exactly one new route.
3. Otherwise the route is treated as removed.

Multiple matching candidates (or none) produce no redirect. Ambiguous matches
emit a `rename-ambiguous` diagnostic; unmatched removals emit a diagnostic whose
severity follows `onUnexpectedRemoval`.

## State

The plugin never writes files directly. The only cross-build state is the route
lock, stored through `context.cache` under the key `routes.lock`. The cache is
created under the resolved plugin cache directory (`.riebeckite/cache` in the
standard HonoX setup) and is gitignored, so the lock is machine-local and is
regenerated from scratch when missing or corrupt.

Because the lock is machine-local, the first build on a fresh machine has no
history and cannot detect a rename that happened before the lock existed.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | Enables rename detection |
| `status` | `301 \| 302 \| 307 \| 308` | `308` | HTTP status for new rename redirects |
| `onUnexpectedRemoval` | `"info" \| "warning" \| "error"` | `"warning"` | Severity when a route disappears without rename evidence |

## Rules and guarantees

- Only entries passing `isPublished` are considered. Private or unpublished
  notes never enter the lock and never produce redirects.
- Existing `manifest.redirects` keys are never overwritten, so Permalink's
  `redirect_from` always wins.
- Permanent redirect chains are collapsed transitively (`A → B`, `B → C`
  becomes `A → C`).
- The lock is deterministic: route keys and redirects are sorted, with no
  timestamps or randomness.
- Redirects are replayed on every build, so the CLI build and the SSG build
  reproduce the same redirects.

## Exports

Functions:

- `renamePlugin(options?)` / `rename(options?)`
- `diffRoutes(previous, current, options?)`
- `buildRouteLock(entries, isPublished)`
- `collapseRedirects(rules)`
- `applyRouteRedirects(manifest, rules)`
- `parseRouteLock(value)`, `emptyRouteLock()`, `hashContent(html)`

Types:

- `RenameOptions`
- `RouteLock`, `RouteLockRoute`, `RouteLockRedirect`, `RedirectRule`
- `DiffRoutesOptions`, `DiffRoutesResult`, `RenameDiagnostic`

## Limitations

- Git-based rename detection is not implemented. It would require filesystem or
  repository access, which plugin code intentionally avoids. Rename detection
  relies on frontmatter `id` and on exact content hashes only.
- A rename in which both the `id` is absent and the HTML body changes cannot be
  detected and is reported as an unexpected removal.

## See also

- [Permalink plugin](../permalink/README.md) — stable URLs and `redirect_from`
- [Plugin guide](../../../docs/docs/reference/plugin-api.md)

