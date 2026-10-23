---
date: 2026-10-20
title: "Cache Derived Data"
sidebar:
  label: "12. Cache Derived Data"
  order: 12
---
# Cache Derived Data

`context.cache` is a plugin-scoped, build-time cache for regenerable JSON values. Use it for work that is expensive and stable across builds, not for authoritative state.

This recipe computes reading time and caches it by a hash of the rendered HTML. A content change produces a new key, so cached minutes are not reused for that content.

```ts
import { definePlugin, type PluginCache } from "@riebeckite/core";

export function readingTimePlugin() {
  return definePlugin({
    name: "reading-time",
    cacheVersion: "1",
    onManifestCreated: async ({ manifest, cache }) => {
      for (const entry of manifest.publicEntries) {
        const minutes = await getReadingMinutes(cache, entry.html);
        entry.headTags = [
          ...(entry.headTags ?? []),
          {
            tag: "meta",
            attrs: {
              name: "reading-time",
              content: String(minutes),
            },
          },
        ];
      }
    },
  });
}

async function getReadingMinutes(
  cache: PluginCache,
  html: string,
): Promise<number> {
  const key = `reading:${hash(html)}`;
  const cached = await cache.get<number>(key);
  if (cached !== undefined) return cached;

  const text = html.replace(/<[^>]+>/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));

  await cache.set(key, minutes);
  return minutes;
}

function hash(value: string): string {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(36);
}
```

Bump `cacheVersion` when the algorithm or stored shape changes. The cache is namespaced by plugin name and version, so a bump starts a clean namespace. Treat a corrupt cache as a miss and regenerate it.

The word count is a rough example. Adjust it for the languages your site publishes.

---

[Back to Plugin Recipes](./README.md) · [Plugin API](../../reference/plugin-api.md)
