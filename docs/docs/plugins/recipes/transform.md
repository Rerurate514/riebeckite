---
date: 2026-10-20
title: "Transform Markdown or HTML"
sidebar:
  label: "1. Transform Markdown or HTML"
  order: 1
---
# Transform Markdown or HTML

Use `remarkPlugins` for an existing unified plugin, or `extendMarkdownPipeline` when you need to call `pipeline.use` yourself. Use `rehypePlugins` and `extendHtmlPipeline` for HTML.

The full walkthrough, including a custom `:::tip` directive, is in [Writing a Plugin](../writing-a-plugin.md#3-transform-markdown-or-html). This recipe shows the shortest form for an off-the-shelf transform.

Install the packages first:

```bash
npm install remark-math rehype-katex
```

```ts
import { definePlugin } from "@riebeckite/core";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

export function mathPlugin() {
  return definePlugin({
    name: "math",
    processedContentCache: {
      version: "1",
      dependencyMode: "none",
    },
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
    assets: [
      {
        pluginName: "math",
        kind: "style",
        moduleSpecifier: "katex/dist/katex.min.css",
      },
    ],
  });
}
```

`processedContentCache` tells Riebeckite that the output depends only on the source, frontmatter, options, and this version. Bump `version` whenever the transform changes. Without the declaration, the plugin still works, but the site cannot reuse processed content.

---

[Back to Plugin Recipes](./README.md) · [Plugin API](../../reference/plugin-api.md)
