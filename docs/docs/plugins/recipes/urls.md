---
date: 2026-10-20
title: "Change Public URLs"
sidebar:
  label: "4. Change Public URLs"
  order: 4
---
# Change Public URLs

`resolveContentLocations` returns new public locations for the entries a plugin owns. Entries you do not return keep their current location, so a plugin can change one section without taking over the whole site.

This recipe moves notes under `notes/` to `/library/` and adds a permanent redirect from the old URL.

```ts
import {
  definePlugin,
  type ContentPublicLocation,
} from "@riebeckite/core";

export function libraryUrlsPlugin(prefix = "/library") {
  const base = prefix.replace(/\/+$/, "");

  return definePlugin({
    name: "library-urls",
    resolveContentLocations: ({ entries }) => {
      const locations: ContentPublicLocation[] = [];

      for (const entry of entries) {
        if (!entry.slug.startsWith("notes/")) continue;

        const path = entry.slug.slice("notes/".length);
        locations.push({
          slug: entry.slug,
          permalink: `${base}/${path}`,
          redirects: [
            {
              path: `/${entry.slug}`,
              status: 301,
            },
          ],
        });
      }

      return locations;
    },
  });
}
```

If another plugin has already resolved the canonical URL and you only need to add redirects or metadata, use `extendContentLocations`. It runs after every resolver, so you do not need to reproduce the permalink.

```ts
import { definePlugin } from "@riebeckite/core";

export function legacyRedirectsPlugin() {
  return definePlugin({
    name: "legacy-redirects",
    extendContentLocations: ({ entries, locations }) => {
      for (const entry of entries) {
        const location = locations.get(entry.slug);
        if (!location) continue;

        const legacy = `/${entry.slug}`;
        if (legacy === location.permalink) continue;
        if (location.redirects?.some((redirect) => redirect.path === legacy)) {
          continue;
        }

        location.redirects = [
          ...(location.redirects ?? []),
          { path: legacy, status: 301 },
        ];
      }
    },
  });
}
```

Multiple plugins can resolve locations. They run in plugin order, and a later result for the same slug replaces an earlier one. Keep one plugin responsible for each URL section, or use `order` to make precedence explicit.

---

[Back to Plugin Recipes](./README.md) · [Plugin API](../../reference/plugin-api.md)
