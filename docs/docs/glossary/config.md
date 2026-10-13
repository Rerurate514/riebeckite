---
title: Config
sidebar:
  hidden: true
---

# Config

The Riebeckite configuration object that controls content, publishing, plugins, themes, and cache behavior. It is validated and resolved before the build uses it.

## What it controls

| Setting | Purpose |
| --- | --- |
| `content.directory` | Where content is read from |
| `content.filters.publishStrategy` | The default [publish strategy](./publish-strategy.md) |
| `plugins` | Which plugins run and their options |
| `theme` | The theme and its options |
| `cache.enabled` | Whether the build caches |

## Validated then resolved

The raw config is validated, then resolved into the form the build uses. Failures are reported before any content is processed, so misconfiguration does not corrupt output.
