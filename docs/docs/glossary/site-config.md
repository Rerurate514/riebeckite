---
title: Site Config
sidebar:
  hidden: true
---

# Site Config

The SiteConfig fields (title, description, author, baseUrl, locale, twitterSite, defaultOgImage, feed) that describe the site and drive SEO, feeds, and locale.

## SiteConfig fields

| Field | Description |
| --- | --- |
| `title` | Site title used in page `<title>` and SEO metadata |
| `description` | Default description for pages |
| `author` | Default author for pages |
| `baseUrl` | Base URL of the site (e.g., `https://example.com`) |
| `locale` | Default locale (e.g., `en`, `ja`) |
| `twitterSite` | Twitter @handle for card metadata |
| `defaultOgImage` | Default Open Graph image URL |
| `feed` | Configuration for RSS/Atom/JSON Feed |

```ts
import { defineConfig } from "@riebeckite/core";

export default defineConfig({
  site: {
    title: "My Site",
    description: "A description",
    author: "Author Name",
    baseUrl: "https://example.com",
    locale: "en",
    twitterSite: "@example",
    defaultOgImage: "/og-image.png",
    feed: {
      type: "rss",
    },
  },
});
```

## Site config in the resolved config
The site config fields are resolved into the `ResolvedRiebeckiteConfig` during config resolution, defined in `packages/core/src/config.ts`. The resolved config includes `site` with `title`, `description`, `author`, `baseUrl`, `locale`, `twitterSite`, `defaultOgImage`, and `feed`. The `feed` sub-section includes `title`, `description`, and `language` (derived from `locale`).

These resolved values are used by the integration and plugins throughout the build and runtime. For example, `buildAbsoluteUrl` uses `config.site.baseUrl`, the SEO plugin uses `config.site.title` and `config.site.description` for metadata, and the l10n plugin uses `config.site.locale` for language detection defaults.

## Related terms

## Related terms

- [[glossary/site|Site]]
- [[config|Config]]
- [[feed|Feed]]
- [[glossary/localization|Localization]]

## Learn more

- [../reference/configuration.md]