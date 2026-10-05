# Obsidian Markdown

Provides the foundation for handling Obsidian Markdown syntax in Riebeckite, including Callouts, WikiLinks, and embeds.

## Installation

```bash
npm install @riebeckite/plugin-obsidian-markdown
```

Check the implementation and package README as the source of truth for the Plugin's export names and configuration options. Riebeckite Plugins are registered in the `plugins` array of `riebeckite.config.ts`.

## Example

Use the Obsidian syntax you already write in your Vault as published content.

```markdown
[[getting-started|Getting Started]]

> [!NOTE]
> このノートは Riebeckite で公開されています。
```

## When to use it

Add this Plugin only when you need its functionality. If it is already included by your Preset, you do not need to register the same Plugin again.

When a rendered example is available, you can also see it in the [Plugin Showcase](./showcase.md).

## Detailed specification

For configuration options, public APIs, constraints, and additional examples, see the package README. For the overall Plugin architecture, see [Plugin System](../framework/plugin-system.md). To create a Plugin, see [Writing a Plugin](./writing-a-plugin.md).

