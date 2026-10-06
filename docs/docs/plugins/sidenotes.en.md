# Sidenotes

Turns GFM footnotes into Tufte-style side notes.

## Installation

```bash
npm install @riebeckite/plugin-sidenotes
```

Check the implementation and package README as the source of truth for the Plugin's export names and configuration options. Riebeckite Plugins are registered in the `plugins` array of `riebeckite.config.ts`.

## Example

Keep writing ordinary footnotes. On desktop each note renders as a margin note next to the reference, and on mobile it becomes a tap-open popover.

```markdown
Riebeckite renders margin notes at the side of the text.[^1]

[^1]: The note text appears beside the reference on desktop and in a popover on mobile.
```

## When to use it

Add this Plugin only when you need its functionality. If it is already included by your Preset, you do not need to register the same Plugin again.

When a rendered example is available, you can also see it in the [Plugin Showcase](./showcase.en.md).

## Detailed specification

For configuration options, public APIs, constraints, and additional examples, see the package README. For the overall Plugin architecture, see [Plugin System](../framework/plugin-system.en.md). To create a Plugin, see [Writing a Plugin](./writing-a-plugin.en.md).
