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
