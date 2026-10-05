# Folder Pages

Turns folder entry notes into folder landing pages and generates a listing for folders that have none.

## Installation

```bash
npm install @riebeckite/plugin-folder-pages
```

Check the implementation and package README as the source of truth for the Plugin's export names and configuration options. Riebeckite Plugins are registered in the `plugins` array of `riebeckite.config.ts`.

## Example

Use it for a docs or notes vault where each folder should have a landing page. A note at `<folder>/README.md` or `<folder>/index.md` becomes the landing page for `/folder/`, and the old `/folder/README` URL redirects to it. A folder without an entry note gets a generated page that lists its direct pages and subfolders.

## When to use it

Add this Plugin only when you need its functionality. If it is already included by your Preset, you do not need to register the same Plugin again.

When a rendered example is available, you can also see it in the [Plugin Showcase](./showcase.md).

## Detailed specification

For configuration options, public APIs, constraints, and additional examples, see the package README. For the overall Plugin architecture, see [Plugin System](../framework/plugin-system.md). To create a Plugin, see [Writing a Plugin](./writing-a-plugin.md).
