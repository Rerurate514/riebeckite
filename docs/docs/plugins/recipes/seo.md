---
title: "Customize SEO"
sidebar:
  label: "10. Customize SEO"
  order: 10
---
# Customize SEO

`seo` lets a plugin supply metadata, sitemap, robots, and feed generation. The first plugin in resolved order that declares `seo` wins, so a custom plugin can wrap the official helpers and override one method.

Keep `@riebeckite/plugin-seo` registered when you still want its endpoints for `sitemap.xml`, feeds, and `robots.txt`.

```ts
import { definePlugin } from "@riebeckite/core";
import {
  buildAbsoluteUrl,
  buildArticleSeo,
  buildPostUrl,
  buildWebsiteSeo,
  getDescription,
  getEntryPublishedTime,
  getEntryUpdatedTime,
  getHtmlLanguage,
  renderAtomFeed,
  renderJsonFeed,
  renderRobots,
  renderRssFeed,
  renderSitemap,
} from "@riebeckite/plugin-seo";

export function titleSuffixPlugin(suffix = " | Example") {
  return definePlugin({
    name: "seo-title-suffix",
    order: -10,
    seo: {
      buildArticleSeo(config, permalink, post, headTags, language) {
        const metadata = buildArticleSeo(
          config,
          permalink,
          post,
          headTags,
          language,
        );
        return { ...metadata, title: `${metadata.title}${suffix}` };
      },
      buildWebsiteSeo,
      buildAbsoluteUrl,
      buildPostUrl,
      getDescription,
      getEntryPublishedTime,
      getEntryUpdatedTime,
      getHtmlLanguage,
      renderSitemap,
      renderRobots,
      renderRssFeed,
      renderAtomFeed,
      renderJsonFeed,
    },
  });
}
```

`order: -10` places this plugin before the official `seo` plugin. The dependency resolver still puts providers before consumers when capabilities are involved.

If you change a title that also appears in JSON-LD, update `jsonLd` in the returned metadata as well. Otherwise the page title and structured data disagree.

---

[Back to Plugin Recipes](./README.md) · [Plugin API](../../reference/plugin-api.md)
