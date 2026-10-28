---
title: Shell UI
---

# Shell UI

`@riebeckite/shell-ui` provides composable site layout primitives. It owns Grid
placement, scrolling, sticky positioning, and semantic layout tokens; themes
only override their CSS values. Layouts are expressed by component composition,
not a `SiteShell` variant.

```tsx
import { ContentContainer, ShellAside, ShellBody, ShellHeader, ShellMain, ShellSidebar, SiteShell } from "@riebeckite/shell-ui";
import { SidebarNavigation } from "@riebeckite/plugin-navigation";

<SiteShell>
  <ShellHeader sticky>...</ShellHeader>
  <ShellBody>
    <ShellSidebar><SidebarNavigation items={items} searchable autoExpandActive /></ShellSidebar>
    <ShellMain><ContentContainer>{children}</ContentContainer></ShellMain>
    <ShellAside><TableOfContents /></ShellAside>
  </ShellBody>
</SiteShell>
```

Use a header, sidebar, main, and aside for Docs; omit the aside for Wiki; wrap
the header and body in `ShellContainer` for a centered Blog; use the same Grid
with application content for a Dashboard. `ShellContainer` limits the Shell,
while `ContentContainer` limits reading width inside Main. `ShellDrawer` is a
native-details mobile fallback.

`SiteNav` is for compact primary or footer navigation. `SidebarNavigation` is
for deep document trees: it supports independent expansion, active-ancestor
expansion, accessible toggle controls, long labels, and optional filter search.
The filter is local to rendered items and does not replace full-text search.
