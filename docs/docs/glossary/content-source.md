---
title: Content Source
sidebar:
  hidden: true
---

# Content Source

The abstraction that discovers and reads content for the rest of the pipeline. The standard implementation reads a filesystem or an Obsidian vault, so the Content Manager never walks the filesystem directly.

## The read side of the pipeline

A content source owns scanning and reading. It returns raw entries with their paths and bytes; parsing and location resolution happen later.

Because reading is behind an interface, the same build can read a local directory, an Obsidian vault, or another source without changing the Content Manager.

## Why it is separate

Keeping acquisition separate means caching and [incremental builds](./incremental-build.md) can reason about file identity, while processing stays pure over the entries it receives.
