---
title: "Extend the Content Graph"
sidebar:
  label: "5. Extend the Content Graph"
  order: 5
---
# Extend the Content Graph

`extendContentGraph` runs after entries and their links are collected, but before the graph and backlinks are built. Mutate `entry.links` to add relationships that Markdown syntax cannot express.

This recipe reads a `related` list from frontmatter and adds note links. The links then appear in the graph and in backlink lists.

```ts
import { definePlugin } from "@riebeckite/core";

export function relatedLinksPlugin() {
  return definePlugin({
    name: "related-links",
    extendContentGraph: ({ entries, contentIndex }) => {
      for (const entry of entries) {
        const related = entry.frontmatter.related;
        if (!Array.isArray(related)) continue;

        for (const raw of related) {
          if (typeof raw !== "string" || raw.trim() === "") continue;

          const key = raw.trim().toLowerCase().replace(/\.md$/, "");
          const slug = contentIndex.get(key);
          if (!slug || slug === entry.slug) continue;
          if (entry.links.some((link) => link.slug === slug)) continue;

          entry.links.push({
            raw,
            slug,
            kind: "note",
            embed: false,
          });
        }
      }
    },
  });
}
```

`contentIndex` keys are lowercase path suffixes and aliases. Resolve a human-written name through the index instead of constructing a slug yourself.

Use `queryContentEntries` from `@riebeckite/core` when a plugin needs to query entries frequently. If the plugin consumes output from `@riebeckite/plugin-query`, declare `requires: ["content.query"]` so it runs after the provider. The graph hook is for relationships, not for replacing a query layer.

---

[Back to Plugin Recipes](./README.md) · [Plugin API](../../reference/plugin-api.md)
