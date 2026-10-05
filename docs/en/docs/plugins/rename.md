# Rename

Turns detected renames and moves into permanent redirects.

## Installation

```bash
npm install @riebeckite/plugin-rename
```

Check the implementation and package README as the source of truth for the Plugin's export names and configuration options. Riebeckite Plugins are registered in the `plugins` array of `riebeckite.config.ts`.

## Example

Use it so old URLs keep working after a note is moved or renamed. Detection matches the frontmatter `id` first, then an exact content hash against the route lock from the previous build, and records a redirect for each match on the existing redirect machinery.

```ts
renamePlugin({ status: 308, onUnexpectedRemoval: "warning" });
```

## When to use it

Add this Plugin only when you need its functionality. If it is already included by your Preset, you do not need to register the same Plugin again.

When a rendered example is available, you can also see it in the [Plugin Showcase](./showcase.md).

## Detailed specification

For configuration options, public APIs, constraints, and additional examples, see the package README. For the overall Plugin architecture, see [Plugin System](../framework/plugin-system.md). To create a Plugin, see [Writing a Plugin](./writing-a-plugin.md).
