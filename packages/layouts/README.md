# @riebeckite/layouts

Optional accessible Drawer behavior for Riebeckite sites. Use standard HTML and site-owned CSS for headers, page grids, spacing, and responsive visibility.

[日本語](./README_ja.md)

```tsx
import { Drawer, DrawerTrigger } from "@riebeckite/layouts";
import "@riebeckite/layouts/style.css";

<header class="site-header">
  <a href="/">My site</a>
  <DrawerTrigger controls="site-menu" label="Menu" icon="menu" />
</header>
<main id="main-content">{children}</main>
<Drawer id="site-menu" label="Navigation">{navigation}</Drawer>
```

Import `@riebeckite/layouts/client` once to enable focus management, Escape, backdrop clicks, and SPA navigation cleanup. Without JavaScript, the trigger remains a fragment link and `:target` reveals the panel.

`Drawer` emits `data-rb-drawer`, `data-rb-drawer-backdrop`, and `data-rb-drawer-panel`. `DrawerTrigger` emits `data-rb-drawer-trigger` and `data-rb-drawer-target`. Site CSS can set `--rb-drawer-inset-block-start`, `--rb-drawer-width`, `--rb-drawer-padding`, and `--rb-drawer-background`.
