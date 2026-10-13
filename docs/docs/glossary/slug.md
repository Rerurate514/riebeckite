---
title: Slug
sidebar:
  hidden: true
---

# Slug

The internal lookup key for a note, used by the content index, the manifest, and the content graph. It is not the public URL; consumers read the permalink from the resolved public location instead.

## Slug versus permalink

| | Slug | Permalink |
| --- | --- | --- |
| Audience | Build internals | Public URL |
| Source | File path | Location resolution |
| Example use | `graph.incoming(slug)` | `<a href={permalink}>` |

## Keep them separate

A slug can change when a file moves, while the permalink follows the configured URL rules. Recomputing a URL from the slug bypasses redirects and localization, so read the [permalink](./permalink.md) instead.
