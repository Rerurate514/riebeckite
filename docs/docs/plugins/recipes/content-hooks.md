---
date: 2026-10-20
title: "Run Code at Content Phases"
sidebar:
  label: "3. Run Code at Content Phases"
  order: 3
---
# Run Code at Content Phases

Content hooks let a plugin observe or modify the build without replacing the Markdown pipeline.

| Hook | When it runs | Typical use |
| --- | --- | --- |
| `onConfigResolved` | After the site config is resolved, before locations | Read `site.baseUrl`, locale, or options |
| `onContentLoaded` | After a Markdown file is read, before parsing | Validate raw source |
| `onPostParsed` | After frontmatter and Markdown are parsed | Adjust the parsed post |
| `onPostProcessed` | After the Markdown/HTML pipeline | Modify final post HTML |
| `onManifestCreated` | After entries, links, and pages are assembled | Add head tags, inspect the whole site |

The following plugin records a diagnostic for every `TODO` marker and reports it after the manifest is built.

```ts
import { definePlugin, type Diagnostic } from "@riebeckite/core";

export function todoCheckPlugin() {
  const diagnostics: Diagnostic[] = [];

  return definePlugin({
    name: "todo-check",
    buildStart: () => {
      diagnostics.length = 0;
    },
    onContentLoaded: ({ slug, markdown }) => {
      const lines = markdown.split(/\r?\n/);
      const index = lines.findIndex((line) => line.includes("TODO"));
      if (index === -1) return;

      diagnostics.push({
        code: "example/todo",
        severity: "warning",
        message: "Remove the TODO before publishing.",
        slug,
        line: index + 1,
      });
    },
    addDiagnostics: () => diagnostics,
  });
}
```

`addDiagnostics` runs after `onManifestCreated`. Riebeckite fills `pluginName` when a diagnostic does not set it, so the CLI can attribute the warning to this plugin.

Use `onManifestCreated` when the work needs the complete entry set, such as adding a document head tag:

```ts
onManifestCreated: ({ manifest }) => {
  for (const entry of manifest.publicEntries) {
    const author = entry.frontmatter.author;
    if (typeof author !== "string") continue;

    entry.headTags = [
      ...(entry.headTags ?? []),
      {
        tag: "meta",
        attrs: { name: "author", content: author },
      },
    ];
  }
}
```

`onPostProcessed` can modify `content.html`, but prefer a renderer or a page type when the output has a clear owner. Injecting fragments into every article makes the layout harder to reason about.

---

[Back to Plugin Recipes](./README.md) · [Plugin API](../../reference/plugin-api.md)
