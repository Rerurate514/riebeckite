# Site content guide

Use this guide for pages under `{{content-directory}}/`. The project configuration and resolved content graph are the source of truth; filenames are not.

## Before editing

Collect these facts first:

- The configured content directory and any `exclude` filters.
- `filters.publishStrategy` and whether the affected page is currently public.
- The page's resolved Public Location, aliases, locale, and current inbound links.
- The project's frontmatter shape, link style, heading style, and line endings.

Useful commands:

```sh
npm run check
npm exec riebeckite inspect config
npm exec riebeckite inspect content --list
npm exec riebeckite inspect graph
```

With MCP connected, use `riebeckite_context`, `riebeckite_diagnostics`, and `riebeckite_links` before editing.

## Frontmatter

Common fields include:

| Field | Meaning |
| --- | --- |
| `title` | Display title; keep it even when the filename is descriptive. |
| `date` | Content date used by listings and feeds. |
| `tags`, `series` | Taxonomy values; preserve the project's existing casing and nesting. |
| `published` | Publication or feed date. It is not the publish switch. |
| `publish` | Explicit publishing flag. Its effect depends on the publish strategy. |
| `private`, `draft`, `visibility` | Visibility controls. Do not remove them to make a page appear. |
| `aliases` | Alternate URLs or names. Treat them as public contracts. |
| `id` | Stable identity. Do not change it without checking references. |

Unknown keys are preserved and may be consumed by Plugins. Do not delete or normalize them.

## Publishing strategy

Check `filters.publishStrategy` in `riebeckite.config.ts`.

- `explicit`: only pages with `publish: true` are public. A new public page needs the flag.
- `selective`: `private: true` and `draft: true` are excluded; `publish` is ignored. Do not add `publish: true` as a substitute for checking the existing visibility fields.
- Frontmatter can override the project default for a page. Follow the behaviour the project already uses.

Use `npm exec riebeckite inspect content --list` to confirm whether a page is included before and after a change.

## Route impact

Treat these changes as public URL changes:

| Change | Required check |
| --- | --- |
| Rename or move a file | Find inbound links, embeds, aliases, and redirects; update or add a redirect. |
| Change `permalink` or slug settings | Compare the old and new Public Location and verify no duplicate route appears. |
| Change `aliases` | Check for collisions and decide whether the old URL should redirect. |
| Change `locale` | Verify translations, language switchers, and canonical URLs. |
| Change `publish`, `private`, `draft`, or `visibility` | Verify listings, feeds, sitemap, search, and redirects. |
| Delete a page | Remove or redirect inbound references; do not leave broken links. |

Do not guess the resulting URL from the filename. Use the resolved Public Location and the built route output.

## Links and embeds

- Prefer root-relative Markdown links that match the project's existing style.
- Resolve a WikiLink or embed target through the content graph before rewriting it.
- When a target is ambiguous, stop and inspect `inspect content --list` or the MCP link result.
- Preserve external URLs and fragments unless the task explicitly changes them.
- Do not "fix" unrelated links in the same edit.

## External content

When `content.directory` points at a git-ignored external repository:

- Edit and commit content in that repository.
- Keep the site repository's content directory out of commits.
- Do not rewrite the content repository's history.
- Verify the CI checkout path still matches `content.directory`.

## Verification

1. `npm run check` for configuration, links, and content validation.
2. `npm run build` when routes, configuration, assets, or publication changed.
3. Inspect `dist/` or the preview for the affected route, redirect, and asset.
4. Run `npm run doctor` when content is missing, unreadable, or unexpectedly excluded.

`npm run build -- --full` bypasses incremental reuse when a stale result is suspected.

## Common failures

| Symptom | Likely cause |
| --- | --- |
| New page is missing from the build | Wrong directory, `exclude` match, or publish strategy. |
| Old link now returns 404 | Rename or deletion without a redirect. |
| Duplicate route | Colliding slug, permalink, alias, or locale. |
| Frontmatter value disappears | Invalid key/value rejected by a Plugin or schema. |
| Local build differs from CI | External content not checked out, or `content.directory` mismatched. |

## Report

State:

- Files changed and the intended public route.
- Publishing decision and why.
- Link/redirect/alias impact.
- Commands run and their results.
- Unresolved diagnostics and any risk to existing URLs.
