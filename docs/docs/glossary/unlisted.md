---
title: Unlisted
sidebar:
  hidden: true
---

# Unlisted

A publishing state where a page is served at its URL but kept out of listings and feeds. It is routable yet not discoverable, which suits share links and draft-like pages.

## Setting it

```yaml
---
visibility: unlisted
---
```

## Effect

The page stays [routable](./routable.md) and produces output, but it is excluded from the [discoverable](./discoverable.md) view, so listings and feeds skip it.
