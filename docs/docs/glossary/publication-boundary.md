---
title: Publication Boundary
sidebar:
  hidden: true
---

# Publication Boundary

The rule that decides which content is safe to publish. Riebeckite applies the publish strategy and frontmatter and centralizes the decision rather than scattering publish checks.

## Strategy and frontmatter

| Source | Example | Effect |
| --- | --- | --- |
| Publish strategy | `selective` | Only content marked for publishing is public |
| Frontmatter | `published: false` | Keeps a note out of the public set |
| Frontmatter | `visibility: unlisted` | Serves the note without listing it |

## One decision point

Because the decision is centralized, every consumer sees the same public set. Pages, [feeds](./feed.md), and sitemaps do not re-check publishing on their own.
