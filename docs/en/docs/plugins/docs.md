# Docs

Generates docs sidebar navigation and previous/next links from a Markdown content subtree.

## Installation

```bash
npm install @riebeckite/plugin-docs
```

## Example

```ts
import { docs } from "@riebeckite/plugin-docs";

export default defineConfig({
  plugins: [
    docs({
      root: "docs",
      sidebar: { auto: true },
      prevNext: true,
    }),
  ],
});
```

```yaml
---
title: Installation
sidebar:
  order: 2
---
```

`root` selects the content subtree. The plugin uses resolved public locations from the manifest, so permalink, rename, alias, l10n, and publishing rules remain owned by the content system.

## Detailed specification

For options, frontmatter metadata, theme hooks, l10n behavior, and publishing boundaries, see the package README. Plugin layout fragments are rendered through the standard article body slot mechanism described in [Plugin API](../reference/plugin-api.md).

