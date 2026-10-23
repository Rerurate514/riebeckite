---
date: 2026-10-20
title: "Add an HTTP Endpoint"
sidebar:
  label: "9. Add an HTTP Endpoint"
  order: 9
---
# Add an HTTP Endpoint

`endpoints` declares HTTP behavior without embedding a router in the plugin. The host integration connects the endpoint to its router. In the scaffold, `app/server.ts` already calls `mountRiebeckiteEndpoints`.

```ts
import { defineEndpoint, definePlugin } from "@riebeckite/core";

export function catalogEndpointPlugin() {
  return definePlugin({
    name: "catalog-endpoint",
    endpoints: [
      defineEndpoint(
        "/catalog.json",
        ({ manifest, request }) => {
          const tag = request.query.tag;
          const entries = manifest.discoverableEntries
            .filter((entry) => !tag || entry.tags.includes(tag))
            .map((entry) => ({
              title: entry.title,
              permalink: entry.permalink,
              tags: entry.tags,
            }));

          return { json: entries };
        },
        { cacheControl: "public, max-age=300" },
      ),
    ],
  });
}
```

Run the dev server and request `/catalog.json`, or `/catalog.json?tag=typescript`.

Endpoints are responses, not static files. A purely static export does not contain `/catalog.json` unless the host writes it. When you need a file in the build output, use [generated outputs](./generated-files.md) instead.

Only use `cacheControl` when the response is safe to cache. The response depends on the manifest, so a short max age is usually appropriate.

---

[Back to Plugin Recipes](./README.md) · [Plugin API](../../reference/plugin-api.md)
