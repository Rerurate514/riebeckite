# Navigation

Provides the site navigation model and the primitive that renders it.

## Installation

```bash
npm install @riebeckite/plugin-navigation
```

Check the implementation and package README as the source of truth for the Plugin's export names and configuration options. Riebeckite Plugins are registered in the `plugins` array of `riebeckite.config.ts`.

## Example

Call `navigation()` with no arguments to derive links from the vault, or pass `items` to author them yourself.

```ts
navigation({
  items: [
    { label: "Docs", href: "/docs/" },
    { label: "Reference", href: "/docs/reference/" },
  ],
});
```

The Plugin owns the navigation model and its rendering mechanics. `SiteNav` renders a resolved tree with the standard `rb-nav` structure, active-path detection, locale-aware normalization, and the `aria-current` contract; the Plugin's own `style.css` ships the structural CSS for that tree and is loaded through the generated plugin styles. The site decides where each rendered list is placed and whether to wrap it in a `<details>` element on small screens. See the [Configuration reference](../reference/configuration.en.md) for the navigation model.

## When to use it

Add this Plugin only when you need its functionality. If it is already included by your Preset, you do not need to register the same Plugin again.

When a rendered example is available, you can also see it in the [Plugin Showcase](./showcase.en.md).

## Detailed specification

For configuration options, public APIs, constraints, and additional examples, see the package README. For the overall Plugin architecture, see [Plugin System](../framework/plugin-system.en.md). To create a Plugin, see [Writing a Plugin](./writing-a-plugin.en.md).
