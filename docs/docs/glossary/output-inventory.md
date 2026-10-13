---
title: Output Inventory
sidebar:
  hidden: true
---

# Output Inventory

The record of every generated output, keyed by path, built from public entries, redirects, plugin pages, and generated outputs. The build compares it with the previous one to find affected, unchanged, and removed outputs.

## What it contains

Lists all outputs the build owns: content outputs, redirect outputs, plugin-page outputs, and generated outputs.
Drives which outputs are rendered, reused, or removed in the current build.

## Comparison

Compared with the previous successful state to determine affected, unchanged, and removed outputs.
The build log reports `SSG outputs` line with `rendered`, `reused`, and `removed` counts.

## Related terms

- [[build|Build]]
- [[ssg|SSG]]
- [[glossary/build-dependency|Build Dependency]]

## Learn more

- [Build System](../framework/build-system.md)
