# Breadcrumbs

Shows a breadcrumb trail built from the note's slug hierarchy.

## Installation

```bash
npm install @riebeckite/plugin-breadcrumbs
```

Check the implementation and package README as the source of truth for the Plugin's export names and configuration options. Riebeckite Plugins are registered in the `plugins` array of `riebeckite.config.ts`.

## Example

Use it so readers can see where a note sits in the folder structure and move up to a parent. The trail starts at the site home and ends at the current note. An intermediate segment uses the folder's index note title when one exists, and a title-cased segment otherwise.

```ts
breadcrumbs({ homeLabel: "Blog", separator: "›" });
```

## When to use it

Add this Plugin only when you need its functionality. If it is already included by your Preset, you do not need to register the same Plugin again.

When a rendered example is available, you can also see it in the [Plugin Showcase](./showcase.md).

## Detailed specification

For configuration options, public APIs, constraints, and additional examples, see the package README. For the overall Plugin architecture, see [Plugin System](../framework/plugin-system.md). To create a Plugin, see [Writing a Plugin](./writing-a-plugin.md).
