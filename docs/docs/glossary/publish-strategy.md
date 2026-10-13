---
title: Publish Strategy
sidebar:
  hidden: true
---

# Publish Strategy

The configuration value that decides how content becomes public, such as publishing everything or only content marked for publishing. It sets the default side of the publication boundary.

## Values

| Strategy | Behavior |
| --- | --- |
| all | Content is public unless frontmatter opts out |
| selective | Only content marked for publishing is public |

## Interaction with frontmatter

The strategy sets the default, and frontmatter such as `published` refines it. Together they form the [publication boundary](./publication-boundary.md).
