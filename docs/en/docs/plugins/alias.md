# Alias

Uses aliases defined on notes for content references and display.

## Installation

```bash
npm install @riebeckite/plugin-alias
```

Check the implementation and package README as the source of truth for the Plugin's export names and configuration options. Riebeckite Plugins are registered in the `plugins` array of `riebeckite.config.ts`.

## Example

Use it when you want a note to have alternate names so Obsidian naming and published references are easier to manage.

```yaml
---
aliases:
  - Riebeckite入門
  - Riebeckite Guide
---
```

## When to use it

Add this Plugin only when you need its functionality. If it is already included by your Preset, you do not need to register the same Plugin again.

When a rendered example is available, you can also see it in the [Plugin Showcase](./showcase.md).

## Detailed specification

For configuration options, public APIs, constraints, and additional examples, see the [package README](../../../../packages/plugins/alias/README.md). For the overall Plugin architecture, see [Plugin System](../framework/plugin-system.md). To create a Plugin, see [Writing a Plugin](./writing-a-plugin.md).

