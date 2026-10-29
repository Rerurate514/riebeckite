---
title: Layouts
---

# Layouts

Riebeckite is a Markdown-first static-site framework, not a UI framework. Start with Markdown, a preset and configuration, then customize output with standard HTML, CSS, and JSX. Most sites do not need `@riebeckite/layouts`.

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

This keeps the DOM, breakpoints, and visual design in the site. Themes provide tokens and plugins provide content; neither requires a layout component.

## Optional Drawer

Use `@riebeckite/layouts` only when a mobile navigation panel needs its accessible interaction behavior.

```tsx
import { Drawer, DrawerTrigger } from "@riebeckite/layouts";
import "@riebeckite/layouts/style.css";

<header class="site-header">
  <DrawerTrigger controls="site-menu" label="Menu" icon="menu" />
</header>
<Drawer id="site-menu" label="Navigation">{navigation}</Drawer>
```

Import the client entry once for focus management, Escape, backdrop clicks, and SPA cleanup:

```ts
import "@riebeckite/layouts/client";
```

Without JavaScript, the fragment link and `:target` still reveal the panel. The component emits `data-rb-drawer`, `data-rb-drawer-backdrop`, `data-rb-drawer-panel`, `data-rb-drawer-trigger`, and `data-rb-drawer-target`. Customize its placement with `--rb-drawer-inset-block-start`, `--rb-drawer-width`, `--rb-drawer-padding`, and `--rb-drawer-background`.
