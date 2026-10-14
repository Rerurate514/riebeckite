---
title: Runtime
sidebar:
  hidden: true
---

# Runtime

The phase after the build where the site serves pages and answers queries. Runtime code reads the manifest and page data rather than reprocessing content.

## Runtime versus build time

| Phase | Work |
| --- | --- |
| Build time | Process content, resolve locations, emit output |
| Runtime | Serve pages, answer queries |

## What runtime reads

Runtime reads the [manifest](./manifest.md) and the prepared page data. It does not parse Markdown again, so the build stays the only place content is interpreted.

## Runtime versus build time in detail
The separation between build time and runtime is a core design principle of Riebeckite:

| Phase | Work |
| --- | --- |
| Build time | Process content, resolve locations, emit output, generate manifest and page data |
| Runtime | Serve pages, answer queries, read manifest and page data without re-processing |

At runtime, the site reads from the `.riebeckite/` directory where the resolved manifest and page data are stored. The runtime does not re-parse Markdown, run the l10n detector, or re-resolve publish strategies. This means:

- The page HTML is already rendered and cached
- Language localization (`lang` frontmatter, `hreflang` links) is already applied
- The publish strategy filter has already been applied
- The search index has already been built

Runtime code typically runs in a host framework like HonoX, reading the manifest to determine which page to serve and what head tags to include. This separation keeps the build as the single source of truth for content interpretation, while the runtime focuses on delivery.

```ts
// Example: runtime reads manifest to determine page
const manifest = require("./.riebeckite/manifest.json");
const page = manifest.pages[requestedPath];
```
