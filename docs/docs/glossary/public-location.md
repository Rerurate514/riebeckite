---
title: Public Location
sidebar:
  hidden: true
---

# Public Location

Where a note is published, combining the internal slug and the canonical permalink with optional redirects and metadata. It is the resolved result that the manifest exposes for each entry.

## Shape

```ts
{
  slug: "notes/hello",
  permalink: "/docs/notes/hello/",
  redirects: ["/docs/hello/"],
  metadata: { /* optional */ },
}
```

## Redirects and metadata

A plugin can attach alias URLs or [redirects](./redirect.md) next to the canonical location. The permalink stays canonical; redirects point older URLs at it.
