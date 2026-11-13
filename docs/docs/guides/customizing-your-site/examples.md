---
date: 2026-11-13
title: Examples
sidebar.label: Examples
sidebar.order: 40
---
# Examples

Before/after snippets for common customizations, starting from the generated starter site. Each example names the file it touches; for the full file map, see [Layout](./layout.md).

## Configuration only — `riebeckite.config.ts`

### Set the site identity

The `site` block controls the name, description, canonical URL, language, and the fallback link-preview image:

```ts
site: {
  title: "My Blog",
  description: "Notes on static sites",
  baseUrl: "https://example.com",
  locale: "en",
  defaultOgImage: "/ogp.png",
},
```

Put a 1200×630 image at `public/ogp.png` so it is served at `/ogp.png`. `baseUrl` must be the real public URL — canonical URLs and Open Graph metadata are built from it.

See [Branding your site](../branding.md) and [Configuration](../../reference/configuration.md).

### Switch the theme

Install a theme package, import its factory, and replace `theme: defaultTheme()`:

```sh
npm install @riebeckite/theme-sakura
```

```ts
import { sakuraTheme } from "@riebeckite/theme-sakura";

export default defineConfig({
  // ...
  theme: sakuraTheme(),
});
```

Theme factories also take options — every theme accepts `colorMode`, `layout`, `preset`, `settings`, and `stylesheets`:

```ts
import { gardenTheme } from "@riebeckite/theme-garden";

theme: gardenTheme({
  colorMode: "system",
  preset: "reading",
  settings: { typography: "serif" },
}),
```

Restart the dev server after changing the config. See [Change Your Theme](../../getting-started/first-theme.md) and [Themes](../../themes/README.md).

### Curate the navigation

Before — the default navigation derives links from the vault:

```ts
plugins: [navigation()],
```

After — pass explicit `items` (with `children` for nested entries) and `secondary` for supplementary links:

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
],
```

See [Pages and navigation](./pages-and-navigation.md) and the [navigation reference](../../reference/configuration/navigation.md).

### Turn on SEO outputs

Before — the starter registers the plugin with sitemap and robots only:

```ts
seo({ sitemap: true, robots: true }),
```

After — also emit RSS / Atom / JSON feeds:

```ts
seo({
  sitemap: true,
  robots: true,
  feed: { rss: true, atom: true, json: true, limit: 30 },
}),
```

This renders `/sitemap.xml`, `/robots.txt`, and the feeds at build time. See the [SEO plugin](../../plugins/seo.md).

### Tune code blocks

Before — the starter enables line numbers, copy button, filename, and highlights:

```ts
codeEnhance({ lineNumbers: true, copyButton: true, filename: true, lineHighlight: true, diffHighlight: true }),
```

After — pick Shiki themes and add a collapse button:

```ts
codeEnhance({
  theme: { light: "github-light", dark: "tokyo-night" },
  lineNumbers: true,
  copyButton: true,
  filename: true,
  lineHighlight: true,
  diffHighlight: true,
  wrapToggle: true,
  collapsible: true,
}),
```

See the [Code Enhance plugin](../../plugins/code-enhance.md).

### Tune related posts

```ts
relatedPosts({
  limit: 8,
  minScore: 2,
  headingText: "Related notes",
}),
```

`limit` caps the list, `minScore` drops weak matches, and `headingText` renames the heading. See the [Related Posts plugin](../../plugins/related-posts.md).

### Redirect old URLs with aliases

If a note has `aliases` in its frontmatter:

```md
---
title: Old Note
aliases:
  - legacy-note
---
```

the `alias` plugin serves `/legacy-note` as a redirect to the canonical permalink. Choose the HTTP status:

```ts
alias({ status: 301 }),
```

See the [Alias plugin](../../plugins/alias.md).

### Tune hover previews

Before — the starter's settings:

```ts
hoverPreview({ delay: 120, excerptLength: 160, selector: 'a[href^="/"]' }),
```

After — a slower, longer preview:

```ts
hoverPreview({ delay: 300, excerptLength: 240 }),
```

See the [Hover Preview plugin](../../plugins/hover-preview.md).

### Make the site multilingual

Add the `l10n` plugin and declare the languages:

```ts
import { l10n } from "@riebeckite/plugin-l10n";

plugins: [
  l10n({ defaultLang: "ja", languages: ["ja", "en", "zh-CN"] }),
],
```

`defaultLang` must appear in `languages`. Non-default languages get URL prefixes, a language switcher, and `hreflang` links. See [Localization](../localization.md).

## Pages and layout — `app/`

### Add a custom page

Create `app/routes/about.tsx`. HonoX file-based routing serves it at `/about`:

```tsx
// app/routes/about.tsx
export default function About() {
  return (
    <main>
      <h1>About</h1>
      <p>This page is mine.</p>
    </main>
  );
}
```

See [Pages and navigation](./pages-and-navigation.md).

### Customize the 404 page

`app/routes/_404.tsx` is an ordinary site file:

```tsx
// app/routes/_404.tsx
import type { Context } from "hono";

const handler = (c: Context) => {
  c.status(404);

  return c.render(
    <div class="not-found">
      <p class="not-found__status">404</p>
      <h1>Not here</h1>
      <p>
        <a href="/">Back to home</a>
      </p>
    </div>,
  );
};

export default handler;
```

Keep `c.status(404)` — a pretty screen served as `200` would be wrong. See [Pages and navigation](./pages-and-navigation.md#404-page-not-found).

### Add custom head tags

In `app/routes/_renderer.tsx`, keep `RiebeckiteHead` (it renders the standard head contents) and add your own tags next to it:

```tsx
<head>
  <RiebeckiteHead
    faviconHref="/favicon.svg"
    seo={c.get("seo")}
    themeStyle={themeStyle}
    themeStylesheets={getThemeStylesheets(config.theme.stylesheets)}
  />
  <meta name="theme-color" content="#0f172a" />
</head>
```

`faviconHref` swaps the site icon; put the file under `public/`. See [Layout](./layout.md) and [Branding your site](../branding.md).

### Rearrange the article page

Before — the starter assembles the article in `app/components/article.tsx`:

```tsx
<ArticleContent>
  <Breadcrumbs />
  <Properties />
  <ArticleBody />
  <ArticleFooter class="site-article__footer">
    <Backlinks />
    <RelatedPosts />
  </ArticleFooter>
</ArticleContent>
<aside class="site-article__aside">
  <TableOfContents className="rr-table-of-contents--desktop" />
</aside>
```

After — move the property panel below the body and add recent posts to the aside:

```tsx
<ArticleContent>
  <Breadcrumbs />
  <ArticleBody />
  <Properties />
  <ArticleFooter class="site-article__footer">
    <Backlinks />
    <RelatedPosts />
  </ArticleFooter>
</ArticleContent>
<aside class="site-article__aside">
  <TableOfContents className="rr-table-of-contents--desktop" />
  <RecentPosts />
</aside>
```

`SiteArticle` is a site component built on the `Article` primitive, so you can edit it freely. See [Layout](./layout.md).

### Place plugin UI beside an article

Before — the article page uses only the generated `app/components/article.tsx`.

After — render plugin components in your own aside component, then use it from `article.tsx`:

```tsx
// app/components/article-aside.tsx
import { Backlinks } from "@riebeckite/plugin-backlinks";
import { TableOfContents } from "@riebeckite/plugin-toc";

export function ArticleAside() {
  return (
    <aside>
      <TableOfContents />
      <Backlinks />
    </aside>
  );
}
```

Context-aware components read the current page from context, so no props are needed; explicit props override the context:

```tsx
// app/components/article.tsx
import { ArticleAside } from "./article-aside";

// ...inside the layout:
<ArticleAside />;
```

See [Plugins and CSS](./plugins-and-css.md).

### Replace the header logo

The header renders the logo in `app/components/site-header.tsx`:

```tsx
<img src="/riebeckite-logo.png" alt="" class="site-header__logo" width="28" height="28" />
```

The simplest change is to overwrite `public/riebeckite-logo.png` with your own square PNG — no code change needed. If you rename the file, update `src` to match. See [Branding your site](../branding.md).

### Create your own component

```tsx
// app/components/callout.tsx
export function Callout({ children }: { children?: unknown }) {
  return <aside class="callout">{children}</aside>;
}
```

Use it from any route or component:

```tsx
// app/routes/about.tsx
import { Callout } from "../components/callout";

export default function About() {
  return (
    <main>
      <h1>About</h1>
      <Callout>Restart the dev server after config changes.</Callout>
    </main>
  );
}
```

See [Layout](./layout.md).

### Build an interactive island

UI that needs browser behavior goes in `app/islands/` as a normal HonoX island:

```tsx
// app/islands/counter.tsx
import { useState } from "hono/jsx";

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button type="button" onClick={() => setCount((c) => c + 1)}>
      Clicked {count} times
    </button>
  );
}
```

Import it from a route or component like any other component:

```tsx
// app/routes/about.tsx
import Counter from "../islands/counter";

export default function About() {
  return (
    <main>
      <h1>About</h1>
      <Counter />
    </main>
  );
}
```

`app/client.ts` already calls `createClient()`, so islands hydrate without further setup. See [Plugins and CSS](./plugins-and-css.md).

## Styling — CSS

### Add site-wide CSS

Before — `app/style.css` imports the generated styles and the preset styles:

```css
@import "./.riebeckite/framework-styles.css";
@import "./.riebeckite/plugin-styles.css";
@import "./.riebeckite/theme-styles.css";
@import "./styles/page.css";
```

After — keep the generated imports first and append your own stylesheet:

```css
@import "./.riebeckite/framework-styles.css";
@import "./.riebeckite/plugin-styles.css";
@import "./.riebeckite/theme-styles.css";
@import "./styles/page.css";
@import "./styles/custom.css";
```

Never edit files under `app/.riebeckite/`; they are regenerated on every build. See [Plugins and CSS](./plugins-and-css.md).

### Restyle plugin UI with CSS hooks

Plugins expose stable root hooks: `rr-<feature>` for plugin UI (for example `rr-code`, `rr-search`) and `rb-*` for framework structure. Unlayered site CSS wins over framework, plugin, and theme declarations:

```css
/* app/styles/custom.css */
.rr-code {
  border-radius: 8px;
}

.rr-code__header {
  font-size: 0.75rem;
}
```

See [CSS hooks](../../reference/plugin-api/ui-and-assets.md#css-hooks).

### Write dark-mode-aware CSS

Use the semantic `--rb-*` tokens (such as `--rb-color-accent`, `--rb-color-border`, `--rb-rule-width`) so colors resolve correctly in light, dark, and system mode:

```css
.my-banner {
  border-bottom: var(--rb-rule-width) solid var(--rb-color-border);
  color: var(--rb-color-accent);
}
```

Only when you must branch on the mode itself, scope the override to the theme root so it also works inside an embedded `.rb-theme-root`:

```css
:is(:root, .rb-theme-root)[data-rb-mode="dark"] .my-banner {
  background: #0f172a;
}
```

See [Stable CSS hooks](../../framework/theme-system/css.md#stable-css-hooks-and-the-cascade).

## Content — Markdown, MDX, frontmatter

### Embed a site component in MDX

Register the plugin once with `mdx({ trusted: true })` (`trusted` is required — MDX evaluates authored JavaScript at build time), then write an `.mdx` page:

```mdx
---
title: Release notes
publish: true
---

import { MdxNote } from "../app/components/mdx-note";

# Release notes

<MdxNote />
```

See the [MDX plugin](../../plugins/mdx.md).

### Show frontmatter as properties

Frontmatter:

```md
---
title: My note
tags: [riebeckite, docs]
status: active
publish: true
---
```

The `properties()` config decides how each key is rendered:

```ts
properties({
  include: ["tags", "status"],
  fields: {
    tags: { type: "tags", variant: "chips" },
    status: {
      type: "badge",
      variants: { active: "success", draft: "warning", archived: "danger" },
    },
  },
}),
```

See the [Properties plugin](../../plugins/properties.md).

### Control publishing from frontmatter

A note without `publish: true` is not built — it is simply absent, and requests to its URL get the 404 page. The same applies to future-dated notes:

```md
---
title: Draft post
# no publish: true → stays private
---
```

See [Content setup](../writing-content/setup.md).
