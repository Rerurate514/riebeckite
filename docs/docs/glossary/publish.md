---
title: Publish
sidebar:
  hidden: true
---

# Publish

The decision to include content in the published site, controlled by the publish strategy and frontmatter such as published and visibility. Published content enters the publication boundary views.

## Inputs to the decision

- The configured publish strategy.
- The `published` frontmatter field.
- The `visibility` frontmatter field.

## Result

Content that passes enters the [routable](./routable.md) and [discoverable](./discoverable.md) views. Content that fails is a [draft](./draft.md) and is excluded from the published set.
