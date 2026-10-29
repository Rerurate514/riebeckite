---
title: Layouts
---

# Layouts

`@riebeckite/layouts` provides composable structural primitives. It owns Grid placement, responsive rail visibility, sticky offsets, independent rail scrolling, Header grouping, and Drawer mechanics. Themes provide visual tokens; plugins render navigation and table-of-contents content.

```tsx
import { ContentContainer, HeaderActions, HeaderBrand, ShellAside, ShellBody, ShellMain, ShellSidebar, SiteHeader, SiteShell } from "@riebeckite/layouts";

<SiteShell>
  <SiteHeader sticky>
    <HeaderBrand>{brand}</HeaderBrand>
    <HeaderActions>{actions}</HeaderActions>
  </SiteHeader>
  <ShellBody>
    <ShellSidebar>{navigation}</ShellSidebar>
    <ShellMain><ContentContainer>{children}</ContentContainer></ShellMain>
    <ShellAside>{toc}</ShellAside>
  </ShellBody>
</SiteShell>
```

The Header spans the viewport independently of `ContentContainer`. `HeaderBrand` stays on the left and `HeaderActions` uses the remaining width for navigation, search, and controls. At `48rem`, Sidebar replaces Drawer; at `64rem`, Aside is added. Sidebar and Aside share the shell sticky offset and scroll independently.

`Drawer` renders a button and focus-managed dialog panel. Import its client entry once:

```ts
import "@riebeckite/layouts/client";
```

Every component accepts `class` and `className`. `ShellMain` additionally accepts `id` and `tabindex`; use `id="main-content"` with SPA navigation.
