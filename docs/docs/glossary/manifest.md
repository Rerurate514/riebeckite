---
title: Manifest
sidebar:
  hidden: true
---

# Manifest

The build-time record of all content, with entries, public views, lookup maps, the content graph, and diagnostics. Pages, runtime queries, incremental builds, and inspection all read from the manifest.

## What the manifest holds

| Field | Contents |
| --- | --- |
| `entries` | Every processed [Content Entry](./content-entry.md) |
| `publicEntries` | Entries safe to publish |
| `discoverableEntries` | Entries allowed in listings and feeds |
| `bySlug`, `byPermalink`, `byAlias` | Lookup maps |
| `graph` | The [content graph](./content-graph.md) |
| `diagnostics` | Collected warnings and errors |

## The boundary between stages

Content processing produces the manifest; page generation, runtime queries, [incremental builds](./incremental-build.md), and inspection consume it. Nothing downstream needs to touch the filesystem.
