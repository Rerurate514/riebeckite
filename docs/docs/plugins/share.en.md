# Share

Adds per-article share links and a copy-link action.

## Installation

```bash
npm install @riebeckite/plugin-share
```

Check the implementation and package README as the source of truth for the Plugin's export names and configuration options. Riebeckite Plugins are registered in the `plugins` array of `riebeckite.config.ts`.

## Example

Use it when readers should share a note to social services from the article. The share links are ordinary anchors that work without JavaScript; only the copy-link button is a progressive enhancement.

```ts
share({ services: ["x", "bluesky", "copy"] });
```

Mastodon is opt-in. Add `"mastodon"` to `services` and set `mastodonInstance`.

## When to use it

Add this Plugin only when you need its functionality. If it is already included by your Preset, you do not need to register the same Plugin again.

When a rendered example is available, you can also see it in the [Plugin Showcase](./showcase.en.md).

## Detailed specification

For configuration options, public APIs, constraints, and additional examples, see the package README. For the overall Plugin architecture, see [Plugin System](../framework/plugin-system.en.md). To create a Plugin, see [Writing a Plugin](./writing-a-plugin.en.md).
