---
title: PageType Generator
---
# PageType Generator

`riebeckite create page-type` creates a public standalone page through a Plugin's `pageTypes` API. It is not a separate routing framework: the generated Plugin uses `paths` for SSG enumeration and `resolve` for page resolution.

```sh
riebeckite create page-type glossary
riebeckite create page-type glossary --path /reference/glossary/ --with-tests --register
riebeckite create page-type glossary --plugin reference-pages --path /glossary/
```

Without `--plugin`, the command creates `extensions/<name>/` with the existing Plugin Generator's `pages` template, README, and optionally tests. With `--plugin`, it creates `page_types/<name>.ts` and adds that exported PageType to a recognized `pageTypes: []` array. The interactive Existing Plugin choice lists local Plugins that have an entry point. It preserves other hooks and refuses an unrecognized structure, duplicate ID, duplicate local path, or existing file; add the PageType manually when that happens.

The generated page lists `manifest.discoverableEntries`, so drafts, private entries, scheduled entries, and unlisted content do not become visible. Its path must be an absolute, normalized URL path ending in `/`; traversal and malformed paths are rejected.

## Edit and test

Edit the generated `resolve` function and its `rr-<feature>` hooks. Keep untrusted text escaped and use `discoverableEntries` unless the public-content contract requires otherwise. Check the Plugin with its generated test, then run:

```sh
pnpm typecheck
riebeckite check
riebeckite build
```

The site owns the document frame and routing. Do not add a Plugin-specific HonoX route or return another document shell. See [Add a Standalone Page](./recipes/pages.md) and [Plugin API](../reference/plugin-api.md).
