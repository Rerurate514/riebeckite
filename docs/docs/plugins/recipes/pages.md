---
date: 2026-10-20
title: "Add a Standalone Page"
sidebar:
  label: "6. Add a Standalone Page"
  order: 6
---
# Add a Standalone Page

`pageTypes` contributes a page without adding a HonoX route. `paths` lists the URLs for static generation, and `resolve` returns the page body for a matching pathname. Return `null` when the path is not yours.

This recipe creates one page per value of the `series` frontmatter field. A note opts in with `series: typescript`.

```ts
import {
  definePlugin,
  escapeHtml,
  escapeHtmlAttribute,
  type ContentManifestEntry,
} from "@riebeckite/core";

export function seriesPages() {
  return definePlugin({
    name: "series-pages",
    pageTypes: [
      {
        id: "series-index",
        paths: ({ manifest }) => {
          const series = new Set<string>();
          for (const entry of manifest.discoverableEntries) {
            const value = getSeries(entry);
            if (value) series.add(value);
          }
          return [...series].sort().map(seriesPath);
        },
        outputDependencies: [{ type: "global" }],
        resolve: ({ manifest, pathname }) => {
          if (!pathname.startsWith("/series/")) return null;

          const series = pathname.slice("/series/".length);
          if (!isSeries(series)) return null;

          const entries = manifest.discoverableEntries
            .filter((entry) => getSeries(entry) === series)
            .sort((left, right) => left.title.localeCompare(right.title));
          if (entries.length === 0) return null;

          const items = entries
            .map(
              (entry) =>
                `<li><a href="${escapeHtmlAttribute(entry.permalink)}">${escapeHtml(entry.title)}</a></li>`,
            )
            .join("");

          return {
            type: "series-index",
            pathname,
            title: `Series: ${series}`,
            body: `<section class="rr-series"><h1>Series: ${escapeHtml(series)}</h1><ul>${items}</ul></section>`,
          };
        },
      },
    ],
  });
}

function getSeries(entry: ContentManifestEntry): string | null {
  const value = entry.frontmatter.series;
  return typeof value === "string" && isSeries(value) ? value : null;
}

function isSeries(value: string): boolean {
  return /^[a-z0-9-]+$/.test(value);
}

function seriesPath(series: string): string {
  return `/series/${series}`;
}
```

`manifest.discoverableEntries` contains public entries only. Use `manifest.publicEntries` when the page should include unlisted entries, and never use `manifest.entries` for published output because it also contains drafts.

The page body is inserted into the site's document frame. Do not emit `<html>`, `<head>`, or a second `<body>`.

---

[Back to Plugin Recipes](./README.md) · [Plugin API](../../reference/plugin-api.md)
