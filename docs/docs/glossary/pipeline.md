---
date: 2026-10-14
title: Pipeline
sidebar:
  hidden: true
---

# Pipeline

The Markdown-to-HTML processing pipeline where Markdown is parsed to an mdast, remark plugins transform it, it is bridged to hast, and rehype plugins transform the HTML; Core drives it and plugins extend it.

## Pipeline stages

The pipeline executes in a fixed order:

1. **Markdown parsing**: `remarkParse`, `remarkFrontmatter`, `remarkGfm`, `remarkMath`
2. **Remark plugins**: site‑specific and user‑provided `remarkPlugins`
3. **Bridge to HTML**: `remarkRehype` with `allowDangerousHtml: true`
4. **Rehype plugins**: `rehypeRaw`, site‑provided `rehypePlugins`, `rehypeSlug`, `rehypeKatex`, `rehypeFormat`
5. **HTML stringification**: `rehypeStringify`

```ts
import { Pipeline } from "@riebeckite/core";

const pipeline = new Pipeline(contentIndex, permalinks);
const post = await pipeline.execute(markdownContent);
```

## Related terms

- [[renderer|Renderer]]
- [[content-hook|Content hook]]
- [[plugin|Plugin]]
- [[content-entry|Content Entry]]

## Learn more

- [../framework/content-system.md]