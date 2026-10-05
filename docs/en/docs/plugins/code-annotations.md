# Code Annotations

Adds line highlighting, focus, and diff markers to code blocks.

## Installation

```bash
npm install @riebeckite/plugin-code-annotations
```

Check the implementation and package README as the source of truth for the Plugin's export names and configuration options. Riebeckite Plugins are registered in the `plugins` array of `riebeckite.config.ts`.

## Example

Use it in technical articles where specific lines should stand out. A brace range after the language highlights lines, and inline marker comments add, remove, or focus lines.

````markdown
```js {2,4-5}
const a = 1;
const b = 2;
const c = 3;
const d = 4;
const e = 5;
```
````

The Plugin works on plain `<pre><code>` blocks and on the line wrappers produced by [Code Enhance](./code-enhance.md), so the two can be combined.

## When to use it

Add this Plugin only when you need its functionality. If it is already included by your Preset, you do not need to register the same Plugin again.

When a rendered example is available, you can also see it in the [Plugin Showcase](./showcase.md).

## Detailed specification

For configuration options, public APIs, constraints, and additional examples, see the package README. For the overall Plugin architecture, see [Plugin System](../framework/plugin-system.md). To create a Plugin, see [Writing a Plugin](./writing-a-plugin.md).
