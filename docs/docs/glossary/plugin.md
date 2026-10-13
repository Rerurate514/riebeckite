---
title: Plugin
sidebar:
  hidden: true
---

# Plugin

A reusable extension that adds features through Core's plugin contracts. Plugins extend the Markdown and HTML pipelines, contribute page types, diagnostics, assets, and client entries, and are ordered by declared capabilities.

## Role

- Adds features without changing Core.
- Declares provides and requires capabilities for ordering.

## Related terms

- [[plugin-dependency|Plugin Dependency]]
- [[lifecycle-hook|Lifecycle Hook]]
- [[renderer|Renderer]]
- [[plugin-cache|Plugin Cache]]

## Learn more

- [Plugin API](../reference/plugin-api.md)
- [Plugin System](../framework/plugin-system.md)
