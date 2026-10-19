---
title: "Share a UI Component"
sidebar:
  label: "7. Share a UI Component"
  order: 7
---
# Share a UI Component

A plugin can export a Hono JSX component, but Riebeckite has no component registry. The site imports the component and decides where to render it. This keeps layout ownership in the site.

Create the component in the plugin package:

```tsx
import type { PluginComponent } from "@riebeckite/core";

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
}) satisfies PluginComponent<SeriesListProps>;

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

---

[Back to Plugin Recipes](./README.md) · [Plugin API](../../reference/plugin-api.md)
