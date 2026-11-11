---
date: 2026-11-11
title: MDX
---
# MDX

Adds trusted MDX content to Riebeckite. MDX pages support Markdown, JSX, JavaScript expressions, ESM imports and exports, and local Hono JSX components.

[日本語](./mdx.ja.md)

## Installation

```sh
npm install @riebeckite/plugin-mdx
```

## Configuration

```ts
import { defineConfig } from "@riebeckite/core";
import mdx from "@riebeckite/plugin-mdx";

export default defineConfig({
  plugins: [mdx({ trusted: true })],
});
```

`trusted: true` is required. MDX evaluates authored JavaScript during server rendering and static generation, so only enable it for content you trust. The plugin throws during configuration when it is omitted.

## Writing MDX

Place `.mdx` files in the configured content directory. Frontmatter and publishing metadata work the same way as Markdown files.

```mdx
---
title: Release notes
publish: true
---

export const version = "1.0";
import { Badge } from "./badge";

# Version {version}

<Badge>Stable</Badge>
```

The MDX module and its relative imports are resolved through Vite. JSX is rendered with the Hono JSX runtime for development SSR and production SSG.

Static relative imports are tracked by incremental builds. Changing an imported local file rebuilds its MDX page, and adding or removing an `.mdx` file reloads the development server.

Search, excerpts, and reading time use a static text projection of the MDX source. Headings come from its HTML projection. Components are not executed for these derived outputs, so their rendered text is not included.

## Components

Pass components available to every MDX page with `components`.

```ts
plugins: [
  mdx({
    trusted: true,
    components: { Callout },
  }),
]
```

Use local relative imports when a component belongs to one page or a group of pages.

Plugin components registered through the [Plugin API components registry](../reference/plugin-api/ui-and-assets.md#markdown-components) are also available to every MDX page. Use them as JSX with the same props as the Markdown fence:

```mdx
<CodeCopy text="npm install" label="Copy command" copiedLabel="Copied" />
```

MDX receives one shared registry, not a separate component implementation. A component passed through `mdx({ components })` with the same name overrides the Plugin component for that MDX page. Interactive Plugin components load and hydrate only when a page renders them.

## Markdown coexistence

Markdown remains unchanged. Do not create `.md` and `.mdx` files with the same slug: Riebeckite reports the collision instead of choosing one arbitrarily.
