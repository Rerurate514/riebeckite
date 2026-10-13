---
title: Draft
sidebar:
  hidden: true
---

# Draft

Content that is kept out of the published site by the publish decision. Drafts can still be processed, but they are excluded from the routable and discoverable views until they are published.

## Setting it

```yaml
---
published: false
---
```

## What still happens

A draft can still be parsed and linked internally, so you can preview and cross-reference it. It produces no public output until it is [published](./publish.md).
