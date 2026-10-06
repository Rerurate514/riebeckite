# WaveDrom

Displays digital timing diagrams written in WaveDrom syntax.

## Installation

```bash
npm install @riebeckite/plugin-wavedrom
```

Check the implementation and package README as the source of truth for the Plugin's export names and configuration options. Riebeckite Plugins are registered in the `plugins` array of `riebeckite.config.ts`.

## Example

Use it to visualize digital signal timing from WaveDrom descriptions.

````markdown
```

```
````

## When to use it

Add this Plugin only when you need its functionality. If it is already included by your Preset, you do not need to register the same Plugin again.

When a rendered example is available, you can also see it in the [Plugin Showcase](./showcase.en.md).

## Detailed specification

For configuration options, public APIs, constraints, and additional examples, see the package README. For the overall Plugin architecture, see [Plugin System](../framework/plugin-system.en.md). To create a Plugin, see [Writing a Plugin](./writing-a-plugin.en.md).

