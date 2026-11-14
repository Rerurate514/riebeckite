---
date: 2026-10-20
title: "Share a Site Component"
sidebar.label: "7. Share a Site Component"
sidebar.order: 7
---
# Share a Site Component

A plugin can export a Hono JSX component as a `PluginSiteComponent` for the Site to place, or register a Markdown component through `markdownComponents`. Use an export when the Site owns layout and decides where the UI goes; use a registered component when a content author should place it from Markdown. This recipe shows the manual export.

Create the component in the plugin package:

```tsx
import type { PluginSiteComponent } from "@riebeckite/core";

export type SeriesListProps = {
  series: readonly {
    title: string;
    permalink: string;
  }[];
};

const SeriesList = (({ series }: Readonly<SeriesListProps>) => {
  if (series.length === 0) return null;

  return (
    <nav class="rr-series" aria-label="Series">
      <ol class="rr-series__list">
        {series.map((item) => (
          <li class="rr-series__item" key={item.permalink}>
            <a class="rr-series__link" href={item.permalink}>
              {item.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}) satisfies PluginSiteComponent<SeriesListProps>;

export default SeriesList;
```

Re-export it from the package root:

```ts
export { default as SeriesList } from "./components/series-list.js";
export type { SeriesListProps } from "./components/series-list.js";
```

A site composes it like any other component:

```tsx
import { SeriesList } from "@example/riebeckite-plugin-series-list";

return (
  <SeriesList
    series={[
      { title: "Part 1", permalink: "/series/typescript/part-1" },
      { title: "Part 2", permalink: "/series/typescript/part-2" },
    ]}
  />
);
```

The component returns `null` when there is nothing to show, so the site can render it unconditionally. If the component needs manifest data, export a helper that accepts a filtered public view; do not read draft content in the browser.

If content authors should place the UI from Markdown instead, declare it through the plugin's `markdownComponents` field and give interactive components a client module. See [Markdown components](../../reference/plugin-api/ui-and-assets.md#markdown-components).

---

[Back to Plugin Recipes](./README.md) · [Plugin API](../../reference/plugin-api.md)
