---
title: Shell UI
---

# Shell UI

`@riebeckite/shell-ui` provides composable site layout primitives. It owns Grid
placement and semantic layout tokens; themes only override their CSS values.

```tsx
import { ShellAside, ShellBody, ShellHeader, ShellMain, ShellSidebar, SiteShell } from "@riebeckite/shell-ui";
import { SidebarNavigation } from "@riebeckite/plugin-navigation";

<SiteShell variant="docs">
  <ShellHeader sticky>...</ShellHeader>
  <ShellBody>
    <ShellSidebar><SidebarNavigation items={items} searchable autoExpandActive /></ShellSidebar>
    <ShellMain>{children}</ShellMain>
    <ShellAside><TableOfContents /></ShellAside>
  </ShellBody>
</SiteShell>
```

Use `docs` for header, sidebar, main and table of contents; `wiki` omits the
aside; `blog` uses centered main content; `dashboard` uses the same grid with
application content. `ShellDrawer` is a native-details mobile fallback.

`SiteNav` is for compact primary or footer navigation. `SidebarNavigation` is
for deep document trees: it supports independent expansion, active-ancestor
expansion, accessible toggle controls, long labels, and optional filter search.
The filter is local to rendered items and does not replace full-text search.
