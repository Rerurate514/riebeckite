# Diff

Displays diffs in a readable form inside content.

## Installation

```bash
npm install @riebeckite/plugin-diff
```

Check the implementation and package README as the source of truth for the Plugin's export names and configuration options. Riebeckite Plugins are registered in the `plugins` array of `riebeckite.config.ts`.

## Example

Use it when explaining before-and-after changes in an article with diff code blocks.

````markdown
```

```
````

When the content directory is inside a Git working tree, a revision panel is appended to the end of the note so past changes can be followed. History is resolved from `content.directory`, so it still works when the build's working directory is an app folder inside a monorepo. The initial comparison is rendered during the build, and further selected comparisons are calculated in the browser. Outside a working tree no panel is added.

## When to use it

Add this Plugin only when you need its functionality. If it is already included by your Preset, you do not need to register the same Plugin again.

When a rendered example is available, you can also see it in the [Plugin Showcase](./showcase.md).

## Detailed specification

For configuration options, public APIs, constraints, and additional examples, see the package README. For the overall Plugin architecture, see [Plugin System](../framework/plugin-system.md). To create a Plugin, see [Writing a Plugin](./writing-a-plugin.md).
