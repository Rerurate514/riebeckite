# Webmention

Receives and renders verified Webmentions for published notes.

## Installation

```bash
npm install @riebeckite/plugin-webmention
```

Check the implementation and package README as the source of truth for the Plugin's export names and configuration options. Riebeckite Plugins are registered in the `plugins` array of `riebeckite.config.ts`.

## Example

Use it when your site should accept Webmentions and show them near the target article. Without a provider the Plugin stores mentions in memory, which suits local previews; supply a durable adapter for production.

```ts
webmention({ provider: d1Storage(env.WEBMENTION_DB) });
```

## When to use it

Add this Plugin only when you need its functionality. If it is already included by your Preset, you do not need to register the same Plugin again.

When a rendered example is available, you can also see it in the [Plugin Showcase](./showcase.md).

## Detailed specification

For configuration options, public APIs, constraints, and additional examples, see the package README. For the overall Plugin architecture, see [Plugin System](../framework/plugin-system.md). To create a Plugin, see [Writing a Plugin](./writing-a-plugin.md).
