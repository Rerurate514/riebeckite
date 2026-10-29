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
while `ContentContainer` limits reading width inside Main. `ShellDrawer` renders
a mobile drawer: a toggle button and a panel that starts hidden.

`SiteNav` is for compact primary or footer navigation. `SidebarNavigation` is
for deep document trees: it supports independent expansion, active-ancestor
expansion, accessible toggle controls, long labels, and optional filter search.
The filter is local to rendered items and does not replace full-text search.

## Components

Every component accepts `class` and `className`, which are appended to its own
class, and renders `children` inside its element.

| Component | Element | Props |
| --- | --- | --- |
| `SiteShell` | `div.rb-shell` | — |
| `ShellContainer` | `div.rb-shell__container` | — |
| `ContentContainer` | `div.rb-content-container` | — |
| `ShellHeader` | `header.rb-shell__header` | `sticky?: boolean` — sets `data-rb-shell-sticky` |
| `ShellBody` | `div.rb-shell__body` | — |
| `ShellSidebar` | `aside.rb-shell__sidebar` | `collapsible?: boolean` — sets `data-rb-shell-collapsible` |
| `ShellMain` | `main.rb-shell__main` | `id?: string`, `tabindex?: number` |
| `ShellAside` | `aside.rb-shell__aside` | — |
| `ShellDrawer` | `div.rb-shell__drawer` | `label?: string`, `icon?: "menu"` |
| `SiteBrand` | `div.rb-shell__brand` | — |

Set `id="main-content"` on `ShellMain` when SPA navigation is enabled.

## Drawer

`label` is the toggle text and defaults to `"Navigation"`. Set `icon: "menu"` to
show a hamburger icon instead of the text; `label` then becomes the button's
`aria-label`.

```tsx
<ShellHeader sticky>
  <SiteBrand>Docs</SiteBrand>
  <ShellDrawer icon="menu" label="Navigation"><DocsSidebar /></ShellDrawer>
</ShellHeader>
```

The toggle, Escape to close, focus handling, and closing on an outside click
come from the client entry. Import it once:

```ts
import "@riebeckite/shell-ui/client";
```

The drawer is hidden from `48rem` up, where the sidebar takes over.
