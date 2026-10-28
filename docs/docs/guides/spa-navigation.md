---
date: 2026-10-23
title: SPA Navigation
---

# SPA Navigation

This guide explains how to enable SPA navigation in a Riebeckite site, which
links it handles, and what the page renderer must provide. It is written for
site developers. The runtime internals are covered separately.

## What SPA navigation does

Riebeckite renders pages on the server. SPA navigation is an optional
enhancement: after the first page load, links that meet the conditions below
fetch the next page in the background and replace only the page content. The
header, footer, and other application chrome stay in place.

Riebeckite does not add a client-side router. Each URL is still rendered by the
server, and a direct visit or reload loads a normal document.

## Enable SPA navigation

Set `spa` in `riebeckite.config.ts`:

```ts
import { defineConfig } from "@riebeckite/core";

export default defineConfig({
  site: { title: "My site", baseUrl: "https://example.com" },
  spa: true,
});
```

`spa: true` enables the runtime with defaults. To configure it, pass an object:

```ts
import { defineConfig } from "@riebeckite/core";

export default defineConfig({
  site: { title: "My site", baseUrl: "https://example.com" },
  spa: {
    prefetch: "hover",
    viewTransitions: true,
  },
});
```

Omit `spa` or set `spa: false` to keep normal browser navigation.

## What changes on a navigation

When an eligible link is clicked, Riebeckite:

- fetches the next HTML document without leaving the current page
- replaces `<main id="main-content">` and matching `data-spa-region` elements
  with the fetched page's output
- updates the document title, language, direction, and page-specific metadata
- hydrates islands in the new page content
- updates history, restores scroll, moves focus to the page content, and
  announces the new page to assistive technology

Unmarked application shell outside the main element is not re-rendered. Global
styles and global scripts stay loaded.

## Which links use SPA navigation

The runtime handles an `<a href>` when all of these are true:

- the link is same-origin and uses HTTP or HTTPS
- `target` is absent or `_self`
- no Meta, Ctrl, Shift, or Alt key is pressed
- the link has no `download` attribute
- the link does not set `data-spa="false"`
- the destination is not only a hash change on the current page

All other links keep normal browser behavior. Add `data-spa="false"` to opt out:

```html
<a href="/print/article" data-spa="false">Print view</a>
```

Forms and programmatic navigation are not intercepted.

## Renderer requirement

Every page must render one main element with the exact ID `main-content`:

```tsx
<SiteHeader />
<main id="main-content" tabindex={-1}>
  {children}
</main>
<SiteFooter />
```

Keep persistent UI outside this element. When shell output depends on the URL,
language, or page data, put it in a named region on every route that can
navigate between it:

```tsx
<header data-spa-region="site-header"><SiteHeader /></header>
<main id="main-content" tabindex={-1}>{children}</main>
<footer data-spa-region="site-footer"><SiteFooter /></footer>
```

Region names must be unique in a document and present in both the current and
fetched page. Regions are replaced before `main`; unmarked shell UI persists.
If either page has no `main#main-content`, the transition falls back to a
normal document navigation.

`tabindex={-1}` lets the runtime move focus to the new content. The runtime adds
it when missing, but rendering it explicitly keeps the intent clear.

## Options

| Option | Type | Default | Effect |
| --- | --- | --- | --- |
| `prefetch` | `false \| "hover"` | `false` | Fetches a same-origin page when the pointer enters its link. |
| `scrollRestoration` | `boolean` | `true` | Saves and restores scroll positions for history entries. |
| `viewTransitions` | `boolean` | `false` | Uses the browser View Transitions API when available and motion is allowed. |

Invalid option values throw when the runtime starts.

`prefetch: "hover"` is best-effort. The runtime skips data-saving and slow
connections (2G and below), deduplicates requests, keeps up to 20 completed
least-recently-used pages for 30 seconds, and aborts pending fetches when the
runtime stops. Cancelling one navigation does not cancel its shared prefetch
request. Use `prefetch: false` if a page has many links and you want to avoid
extra requests.

## Page scripts and islands

Islands inside the new main element are hydrated after replacement. A plain
`<script>` tag is not re-executed during an SPA navigation. Put page interaction
in an island or in a plugin client entry so Riebeckite can initialize it on each
page.

Only global stylesheets stay loaded. Stylesheet changes are not applied: a
stylesheet that exists only on the next page is not added. Include shared styles
globally.

Custom code can react to a completed transition with the
`spa:navigation` event. Shell behavior that attaches listeners to a
region must reinitialize after this event, or use event delegation:

```ts
document.addEventListener("spa:navigation", (event) => {
  const { url, popstate } = (
    event as CustomEvent<{
      url: string;
      popstate: boolean;
    }>
  ).detail;
  console.log("navigated", url, popstate);
});
```

The event fires after the new page is committed. It does not fire for the
initial page load.

## Limits

- SPA navigation needs JavaScript. The first load is still a normal
  server-rendered page, and an SPA-off build behaves as before.
- Only same-origin GET links are handled. Cross-origin links, forms, downloads,
  and new-tab links are left to the browser.
- A missing `main#main-content` or a failed fetch falls back to a full document
  load.
- The runtime fetches history entries unless a fresh cached response is
  available. The cache is short-lived, so offline back/forward is not reliable.
- Page-specific `<script>` and stylesheet changes are not applied. Use islands
  and global assets.
- View transitions depend on browser support and are skipped when
  `prefers-reduced-motion: reduce` is set.
- SPA navigation is not a router. Route matching, redirects, and HTML generation
  still happen on the server.

## Related

- [SPA navigation architecture](../framework/spa-navigation.md)
- [SPA runtime internals](../framework/spa-runtime.md)
- [HonoX integration](../framework/honox-integration.md)
- [Configuration](../reference/configuration.md)
