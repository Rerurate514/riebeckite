---
date: 2026-10-06
title: Pages and navigation
sidebar:
  label: Pages and navigation
  order: 20
---
# Pages and navigation

## Navigation

The links shown in the Header and Footer come from the
[`@riebeckite/plugin-navigation`](../../reference/configuration/navigation.md)
plugin, which you register in `riebeckite.config.ts`.

```ts
plugins: [
  navigation({
    items: [
      { label: "Guide", href: "/guide" },
      {
        label: "Notes",
        href: "/notes/planning",
        children: [
          { label: "Planning", href: "/notes/planning" },
          { label: "Writing", href: "/notes/writing" },
        ],
      },
    ],
    secondary: [{ label: "GitHub", href: "https://github.com/example/site" }],
  }),
]
```

Called with no arguments, `navigation()` derives the links from the vault. Pass
`items` to curate them yourself and `secondary` for supplementary links.

The plugin produces the model and renders each tree through `SiteNav`; the site
decides where the rendered list is placed. In the starter,
`app/components/site-header.tsx` uses `SiteNav`, and `app/routes/_renderer.tsx`
passes the resolved model and the current path in. So it helps to think in terms
of:

- **Adding or removing a link** → change `navigation({ items })`
- **Deriving links from the vault** → call `navigation()` with no arguments
- **Changing the Header look or HTML** → change `site-header.tsx`
- **Changing where the Header / Footer sits** → change `_renderer.tsx`

Rendering mechanics — recursive children, active-path detection, locale-aware
normalization, external links, and `aria-current` — live in `SiteNav`, so the
site never has to reimplement them.

See the [configuration reference](../../reference/configuration/navigation.md) for
the fields you can set.

## Pages and links that plugins provide

Besides the Header / Footer navigation, plugins can add pages and links. These
fall into two broad kinds.

### Pages you browse (Content Discovery)

For example:

- [[glossary/search|Search]]
- Tag / Folder indexes
- [[glossary/taxonomy|Taxonomy]] pages
- Feeds
- [[glossary/sitemap|Sitemap]]

Plugins generate the pages or endpoints these need. Enabling a plugin does not
by itself add a link to the Header or Footer. To show one there, add the page to
`navigation` like any other page.

### UI that links articles (Content Relationship)

For example:

- Breadcrumbs
- Backlinks
- Related Posts
- [[glossary/series|Series]] previous/next links
- Local Graph

These are mostly rendered inside article pages. A plugin exposes a component,
and the Site renders it wherever it belongs, such as the article header or
footer.

In short:

```text
Header / Footer links
        ↓
navigation in riebeckite.config.ts

Pages such as search, tags, and folders
        ↓
plugin page types

Breadcrumbs, backlinks, and so on
        ↓
plugin components
```

## Adding routes

`app/routes/` is a normal HonoX route directory, so you can add site-specific
pages as usual. To create `/about`, for example, add it as a HonoX route.

For Markdown content and pages a plugin provides, you generally do not add a
route yourself. The starter's catch-all route calls `createContentRoute` to resolve content
and plugin page types automatically.

To show a plugin page in the Header or Footer, add a link to `navigation` rather
than creating a new route.

## 404 (page not found)

Unknown URLs are handled by HonoX's standard `_404.tsx` route. It is an
ordinary site file, so editing it changes the "page not found" screen:

```tsx
// app/routes/_404.tsx
import type { NotFoundHandler } from "hono";

const handler: NotFoundHandler = (c) => {
  c.status(404);

  return c.render(
    <div class="not-found">
      <h1>Page not found</h1>
      <p>The page you requested does not exist or is not available.</p>
      <a href="/">Back to home</a>
    </div>,
  );
};

export default handler;
```

Riebeckite decides that a request is not found, but the response is rendered
through `_renderer.tsx`, so the 404 screen reuses the site's theme, head, Header,
and Footer. Two rules matter:

- Always keep the status at 404. The generated presets call `c.status(404)`;
  a pretty screen served as `200` would be wrong.
- Presentation is site-owned. The markup, copy, links, and CSS are all yours.
  Riebeckite does not ship a default 404 component to override.

The 404 screen only ever sees requests that are not found. [[glossary/draft|Draft]], future-dated,
and otherwise unpublished content never reaches it, so a 404 cannot reveal that
private content exists.

### Runtime errors (optional)

Hono's default error handling already logs the error and returns a plain
`500 Internal Server Error`, so a site does not have to add anything.
If you want a site-owned visitor-facing error screen, HonoX supports
`app/routes/_error.tsx` (an `ErrorHandler`). The generated presets do not add
it: configuration, plugin, and build errors are developer-facing and should
stay visible instead of being disguised as a page.
