---
date: 2026-10-20
title: "Render an Embedded File"
sidebar:
  label: "2. Render an Embedded File"
  order: 2
---
# Render an Embedded File

`renderers` replace the default output for an embedded content target. A renderer receives the target kind, source path, label, public URL, and whether the author used a link or an embed. Return `null` when the renderer does not handle the target so another renderer can try.

This recipe previews the first lines of an embedded CSV file.

```ts
import {
  definePlugin,
  escapeHtml,
  getExtension,
  readContentSourceEntry,
} from "@riebeckite/core";

const PREVIEW_LINES = 8;

export function csvPreviewPlugin() {
  return definePlugin({
    name: "csv-preview",
    processedContentCache: {
      version: "1",
      dependencyMode: "tracked",
    },
    renderers: [
      {
        name: "csv-preview",
        render: async (context) => {
          if (context.kind !== "attachment" || !context.embed) return null;
          if (getExtension(context.path) !== "csv") return null;
          if (!context.contentSource) return null;

          const source = await readContentSourceEntry(
            context.contentSource,
            context.path,
          );
          if (source === null) return null;

          const text =
            typeof source === "string"
              ? source
              : new TextDecoder().decode(source);
          const preview = text
            .split(/\r?\n/)
            .slice(0, PREVIEW_LINES)
            .join("\n");

          return `<pre class="rr-csv-preview">${escapeHtml(preview)}</pre>`;
        },
      },
    ],
    assets: [
      {
        pluginName: "csv-preview",
        kind: "style",
        moduleSpecifier: "/extensions/plugin.css",
      },
    ],
  });
}
```

Add the stylesheet:

```css
.rr-csv-preview {
  overflow-x: auto;
  border: 1px solid var(--rb-color-border);
  border-radius: 4px;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
}
```

Use a note with `![[data.csv]]` to see the preview. A plain link such as `[[data.csv]]` returns `null` and keeps the default link rendering.

The preview is plain text on purpose. Splitting CSV on commas breaks quoted fields; use a CSV parser if you need a table. Reading the source also means the output depends on an external file, so the recipe uses `dependencyMode: "tracked"`.

---

[Back to Plugin Recipes](./README.md) · [Plugin API](../../reference/plugin-api.md)
