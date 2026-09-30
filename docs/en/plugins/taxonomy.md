# Taxonomy

Provides index pages based on classifications such as tags and folders.

## Installation

```bash
npm install @riebeckite/plugin-taxonomy
```

Check the implementation and package README as the source of truth for the Plugin's export names and configuration options. Riebeckite Plugins are registered in the `plugins` array of `riebeckite.config.ts`.

## Example

Use frontmatter tags or folder structure to group content and let readers browse pages in the same classification.

```yaml
---
tags:
  - flutter
  - architecture
---
```

## When to use it

Add this Plugin only when you need its functionality. If it is already included by your Preset, you do not need to register the same Plugin again.

When a rendered example is available, you can also see it in the [Plugin Showcase](./showcase.md).

## Detailed specification

For configuration options, public APIs, constraints, and additional examples, see the [package README](../../../packages/plugins/taxonomy/README.md). For the overall Plugin architecture, see [Plugin System](../framework/plugin-system.md). To create a Plugin, see [Writing a Plugin](./writing-a-plugin.md).
