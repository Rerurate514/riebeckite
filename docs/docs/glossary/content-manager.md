---
title: Content Manager
sidebar:
  hidden: true
---

# Content Manager

The component that turns scanned entries into a finished manifest. It resolves public locations, runs the Markdown and plugin pipeline, and builds the content graph and query indexes.

## Responsibilities

- Resolve the public location of each entry.
- Run the Markdown and plugin pipeline over each entry.
- Build the [content graph](./content-graph.md) and [content index](./content-index.md).
- Assemble the [manifest](./manifest.md) and collect diagnostics.

## Order of work

Location resolution runs first so later hooks and pages can rely on a stable [permalink](./permalink.md). Processing follows, then the graph, then the manifest is finalized.

## What it does not do

The Content Manager does not read files. That belongs to the [Content Source](./content-source.md).
