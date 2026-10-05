# Text Fragment

Copies a Text Fragment deep link or a Markdown quote for selected article text.

## Installation

```bash
npm install @riebeckite/plugin-text-fragment
```

Check the implementation and package README as the source of truth for the Plugin's export names and configuration options. Riebeckite Plugins are registered in the `plugins` array of `riebeckite.config.ts`.

## Example

Use it when readers should be able to point at a specific passage. Selecting text inside an article shows a popover with two actions: **Copy link** builds a `#:~:text=` URL that highlights the selection, and **Copy quote** builds a Markdown block quote with a link back to the page.

## When to use it

Add this Plugin only when you need its functionality. If it is already included by your Preset, you do not need to register the same Plugin again.

When a rendered example is available, you can also see it in the [Plugin Showcase](./showcase.md).

## Detailed specification

For configuration options, public APIs, constraints, and additional examples, see the package README. For the overall Plugin architecture, see [Plugin System](../framework/plugin-system.md). To create a Plugin, see [Writing a Plugin](./writing-a-plugin.md).
