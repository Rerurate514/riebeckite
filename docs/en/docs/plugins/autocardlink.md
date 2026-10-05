# AutoCardLink

Renders `cardlink` code blocks as link preview cards.

## Installation

```bash
npm install @riebeckite/plugin-autocardlink
```

Check the implementation and package README as the source of truth for the Plugin's export names and configuration options. Riebeckite Plugins are registered in the `plugins` array of `riebeckite.config.ts`.

## Example

Use it when a link should appear as a card with a title, description, favicon, and optional preview image instead of a bare URL.

````markdown
```cardlink
url: https://example.com/post
title: "Example post"
description: "A short summary of the linked page."
host: example.com
```
````

## When to use it

Add this Plugin only when you need its functionality. If it is already included by your Preset, you do not need to register the same Plugin again.

When a rendered example is available, you can also see it in the [Plugin Showcase](./showcase.md).

## Detailed specification

For configuration options, public APIs, constraints, and additional examples, see the package README. For the overall Plugin architecture, see [Plugin System](../framework/plugin-system.md). To create a Plugin, see [Writing a Plugin](./writing-a-plugin.md).
