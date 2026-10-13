---
title: Root
sidebar:
  hidden: true
---

# Root

A base directory that Riebeckite resolves other paths against, such as the application root and the content root. Resolving against a stable root keeps paths portable across machines.

## Roots

| Root | Meaning |
| --- | --- |
| Application root | The directory the site is built from |
| Content root | The directory content is read from |

## Portable paths

Relative paths in the config are resolved against the application root, so the same config works on another machine. The content root is what the [Content Source](./content-source.md) scans.
