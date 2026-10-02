# Changelog

Makes change history easier to present as published content.

## Installation

```bash
npm install @riebeckite/plugin-changelog
```

Check the implementation and package README as the source of truth for the Plugin's export names and configuration options. Riebeckite Plugins are registered in the `plugins` array of `riebeckite.config.ts`.

## Example

Use it to publish release notes or project change history in a form that is easy to follow on the site.

When the content directory is inside a Git working tree, a "Change history" list of commit date, subject, and author is appended to the end of each note. History is resolved from `content.directory`, so it still works when the build's working directory is an app folder inside a monorepo. Outside a working tree the plugin reports a `changelog-content-outside-repository` warning and adds nothing.

## When to use it

Add this Plugin only when you need its functionality. If it is already included by your Preset, you do not need to register the same Plugin again.

When a rendered example is available, you can also see it in the [Plugin Showcase](./showcase.md).

## Detailed specification

For configuration options, public APIs, constraints, and additional examples, see the [package README](../../../packages/plugins/changelog/README.md). For the overall Plugin architecture, see [Plugin System](../framework/plugin-system.md). To create a Plugin, see [Writing a Plugin](./writing-a-plugin.md).
