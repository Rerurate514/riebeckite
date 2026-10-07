# Shortcodes

Renders `:name` (inline), `::name` (block), and `:::name` (block container) directives through a registry of shortcode renderers.

## Installation

```bash
npm install @riebeckite/plugin-shortcodes
```

Check the implementation and package README as the source of truth for the Plugin's export names and configuration options. Riebeckite Plugins are registered in the `plugins` array of `riebeckite.config.ts`.

## Example

Use the built-in shortcodes for badges, keyboard keys, notes, and embeds, or register your own renderers. A single colon renders inline, a double colon renders as a block leaf, and a triple colon renders as a block container.

```markdown
The status is :badge[Stable]{variant=success} and the shortcut is :kbd[Ctrl+K].

Block directives look like this:

::badge[Stable]{variant=success}

:::note[Heads up]{type=warning}
Container bodies support **Markdown**.
:::
```

## When to use it

Add this Plugin only when you need its functionality. If it is already included by your Preset, you do not need to register the same Plugin again.

When a rendered example is available, you can also see it in the [Plugin Showcase](./showcase.en.md).

## Detailed specification

For configuration options, public APIs, constraints, and additional examples, see the package README. For the overall Plugin architecture, see [Plugin System](../framework/plugin-system.en.md). To create a Plugin, see [Writing a Plugin](./writing-a-plugin.en.md).
