---
date: 2026-10-23
title: Metadata
sidebar:
  label: Metadata
  order: 20
---
# Metadata

## Updating page metadata

Before replacing the main element, the runtime updates the parts of `<head>`
that can change from page to page:

- sets `document.title` from the fetched page
- copies `<html lang>` and `<html dir>`, or removes them when absent
- removes current head children matching the page-owned set
- clones matching children from the fetched page into the current head

The boundary between page-owned and persistent elements is explicit:

- `data-riebeckite-head="page"` nodes are replaced.
- `data-riebeckite-head="global"` and `"runtime"` nodes persist.
- [[glossary/plugin|Plugin]] `meta` and `link` head tags are marked page-owned automatically.
- Plugin data scripts (`application/ld+json`, `application/json`) are also
  page-owned.
- Executable plugin scripts are left unowned so they are neither cloned nor
  re-executed.

The following legacy selector set is also page-owned for compatibility:

- `link[rel="canonical"]`, `link[hreflang]`
- `script[type="application/ld+json"]`
- `meta[name="description"]`, `meta[name="author"]`,
  `meta[name="robots"]`
- `meta[name^="twitter:"]`
- `meta[property^="og:"]`, `meta[property^="article:"]`

Everything else in the head persists. An executable `<script>` is never
replaced, even when it has `data-riebeckite-head="page"`, because running it
again would repeat its side effects. A `<script>` or `<style>` without an
ownership attribute also persists.

## History, scroll, focus, and announcements

When scroll restoration is enabled, the runtime sets
`history.scrollRestoration = "manual"` and restores the previous value on stop.

It saves the scroll position into `history.state` with `replaceState` when
scrolling settles and immediately before a click navigation. Back and forward
navigation restores the saved position. When no position was saved, it does not
restore one.

A click navigation pushes an entry with `{ scroll: [0, 0] }` after a successful
commit and scrolls to the top. A URL with a hash scrolls to the matching element
instead.

History:

- Click navigations push a new entry after a successful commit.
- `popstate` navigations do not push.
- Redirects use the response URL.

Focus and announcement:

- Unless the URL has a hash, the runtime adds `tabindex="-1"` if needed and
  focuses the new main element with `preventScroll`.
- It creates or reuses `#riebeckite-navigation-announcer`, an
  `aria-live="polite"` element, and sets its text to the new document title.
- The `spa:navigation` event carries `{ url, popstate }`.

## Prefetch

`prefetch: "hover"` adds a `pointerover` listener. It uses the same link
eligibility rules as click navigation and ignores hash-only links.

The cache:

- holds at most 20 completed least-recently-used entries, keyed by URL
- deduplicates active requests from prefetch and navigation
- keeps successful responses for 30 seconds
- removes failed and expired entries
- aborts pending work when the runtime stops

Prefetch is skipped for data-saving, `slow-2g`, and `2g` connections. A caller's
abort signal rejects only that caller; it does not cancel a shared request.
