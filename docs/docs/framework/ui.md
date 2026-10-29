---
title: UI
---

# UI

Riebeckite is a Markdown-first static-site framework, not a UI framework. Start with Markdown, a preset and configuration, then customize output with standard HTML, CSS, and JSX. Most sites do not need `@riebeckite/ui`.

## Standard site structure

Use semantic elements and own the responsive rules in site CSS:

```tsx
<header class="site-header">{navigation}</header>
<div class="site-layout">
  <aside class="site-sidebar">{sidebar}</aside>
  <main id="main-content" tabindex={-1} class="site-main">{children}</main>
  <aside class="site-aside">{toc}</aside>
</div>
<footer>{footer}</footer>
```

```css
.site-layout { display: grid; }
.site-sidebar, .site-aside { display: none; }
@media (min-width: 48rem) { .site-sidebar { display: block; } }
@media (min-width: 64rem) { .site-layout { grid-template-columns: 18rem minmax(0, 1fr) 16rem; } .site-aside { display: block; } }
```

This keeps the DOM, breakpoints, and visual design in the site. Themes provide tokens and plugins provide content; neither requires a UI component.

## Optional primitives

`@riebeckite/ui` has two roles:

- The root export provides the shared `SiteProvider` and `ArticleProvider` context used by plugins.
- Subpath exports provide optional headless primitives and accessibility behaviors. Sites and plugins opt in only to what they use.

Do not install or import the primitives for a normal site unless a feature needs them. Core, the Markdown pipeline, themes, and SSG do not depend on them.

## Drawer

Use the Drawer only when a mobile navigation panel needs accessible overlay behavior.

```tsx
import { Drawer, DrawerTrigger } from "@riebeckite/ui/drawer";
import "@riebeckite/ui/styles/drawer.css";

<header class="site-header">
  <DrawerTrigger controls="site-menu" label="Menu" icon="menu" />
</header>
<Drawer id="site-menu" label="Navigation">{navigation}</Drawer>
```

Import the client entry once for focus management, Escape, outside clicks, and SPA cleanup:

```ts
import "@riebeckite/ui/drawer/client";
```

The component emits `data-rb-drawer`, `data-rb-drawer-backdrop`, `data-rb-drawer-panel`, `data-rb-drawer-trigger`, and `data-rb-drawer-target`. Customize its placement with `--rb-drawer-inset-block-start`, `--rb-drawer-width`, `--rb-drawer-padding`, and `--rb-drawer-background`.

Without JavaScript, the trigger remains a fragment link and `:target` reveals the panel. This fallback cannot provide dialog semantics, a focus trap or focus restore, Escape and outside-click dismissal, scroll lock, or a dependable close affordance. Provide an in-panel close link when no-JavaScript use matters; use the client entry when full dialog behavior is required.

## Dialog

Prefer the native `<dialog>` element and its `showModal()` behavior. Use the controller when a dialog also needs trigger state, focus restore, and scroll locking:

```ts
import { createDialogController } from "@riebeckite/ui/dialog";

const controller = createDialogController(dialog, {
  triggers: [openButton],
  closeButtons: [closeButton],
  initialFocus: () => input,
});
```

The controller keeps `aria-expanded` in sync, closes on backdrop clicks, restores focus on close, and reference-counts scroll locking. It does not replace the native dialog's own focus management or Escape handling.

## Tabs

Use native buttons with the WAI-ARIA tabs pattern. `createTabs()` manages selection, arrow keys, Home/End, focus, `aria-selected`, `tabindex`, and panel visibility:

```ts
import { createTabs } from "@riebeckite/ui/tabs";

const tabs = createTabs(tablist, {
  onSelect: ({ index }) => {
    /* feature-specific side effects */
  },
});
```

Call `tabs.destroy()` when the tab group is removed. The primitive does not own tab markup or feature semantics; plugins such as Code Tabs keep their Markdown conversion and synchronization rules.

## Clipboard

`copyText()` uses the Clipboard API when available and falls back to a temporary textarea while preserving the current selection:

```ts
import { copyText } from "@riebeckite/ui/copy";

if (await copyText(value)) {
  /* show success */
}
```

Plugins keep their own labels, status announcements, and button markup.

## Behaviors

The `@riebeckite/ui/behaviors` subpath exposes the small pieces used by the primitives: `getFocusable`, `focusFirst`, `trapFocus`, `createDismissable`, and `lockScroll`. They are safe to import during SSR and do not access the document until called in a browser.

Use them directly only when a plugin has overlay behavior that the higher-level primitives do not cover.
