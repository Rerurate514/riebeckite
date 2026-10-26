---
date: 2026-10-14
title: Deterministic Build
sidebar:
  hidden: true
---

# Deterministic Build

A build that produces the same output given the same inputs, ensured by consistent fingerprints, pipeline versioning, and configuration snapshots.

## Ensuring determinism

Consistent content fingerprints (source, frontmatter, pipeline, plugin cacheVersion).
Pipeline fingerprint includes plugin configurations and content-filter settings.
Configuration snapshots are recorded in build state and external dependencies.

## Fallback

If determinism cannot be confirmed (e.g., unsafe plugins, global dependencies), a full build path is taken. A missing or incompatible cache or state entry also causes a full build path.

## Related terms

- [[fingerprint|Fingerprint]]
- [[build|Build]]
- [[check|Check]]

## Learn more

- [Build System](../framework/build-system.md)
