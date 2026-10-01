# Diagnostics

Provides diagnostic information for investigating build, Plugin, and site-wide content integrity problems.

The Plugin reports site-wide reference issues from the resolved Riebeckite manifest: missing internal routes, unresolved WikiLinks, missing local assets, duplicate public locations, and redirect conflicts/cycles. It reuses `ContentPublicLocation`, public entries, public redirects, plugin page paths, plugin assets, and generated outputs, so permalink, alias, rename, l10n, publish/exclude, and Page System behavior match the build pipeline.

It does not crawl external URLs, run SEO/Lighthouse checks, or auto-fix content. External schemes such as `http:`, `https:`, `mailto:`, `tel:`, and `data:` are ignored; query strings and fragments are stripped before checking a site-local route.

## Installation

```bash
npm install @riebeckite/plugin-diagnostics
```

Check the implementation and package README as the source of truth for the Plugin's export names and configuration options. Riebeckite Plugins are registered in the `plugins` array of `riebeckite.config.ts`.

## Example

Use it during development to identify where Plugin or content-processing problems occur.

## When to use it

Add this Plugin only when you need its functionality. If it is already included by your Preset, you do not need to register the same Plugin again.

When a rendered example is available, you can also see it in the [Plugin Showcase](./showcase.md).

## Detailed specification

For configuration options, public APIs, constraints, and additional examples, see the [package README](../../../../packages/plugins/diagnostics/README.md). For the overall Plugin architecture, see [Plugin System](../framework/plugin-system.md). To create a Plugin, see [Writing a Plugin](./writing-a-plugin.md).

