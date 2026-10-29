---
title: Layouts
---

# Layouts

`@riebeckite/layouts` provides composable structural primitives. It owns Grid placement, responsive rail visibility, sticky offsets, independent rail scrolling, Header grouping, the Drawer shell, and the responsive layout primitives. Themes provide visual tokens; plugins render navigation and table-of-contents content.

## Shell composition

```tsx
import {
  ContentContainer,
  Drawer,
  DrawerTrigger,
  HeaderActions,
  HeaderBrand,
  ShellAside,
  ShellBody,
  ShellMain,
  ShellSidebar,
  SiteHeader,
  SiteShell,
} from "@riebeckite/layouts";

<SiteShell>
  <SiteHeader sticky>
    <HeaderBrand>{brand}</HeaderBrand>
    <HeaderActions wrap>
      {desktopNavigation}
      {search}
      <DrawerTrigger controls="site-menu" label="Menu" icon="menu" />
    </HeaderActions>
  </SiteHeader>
  <ShellBody>
    <ShellSidebar at="md">{navigation}</ShellSidebar>
    <ShellMain id="main-content" tabindex={-1}>
      <ContentContainer>{children}</ContentContainer>
    </ShellMain>
    <ShellAside at="lg">{toc}</ShellAside>
  </ShellBody>
  <Drawer id="site-menu" label="Navigation">
    {mobileNavigation}
  </Drawer>
</SiteShell>
```

The Header spans the viewport independently of `ContentContainer`. `HeaderBrand` stays on the left and `HeaderActions` uses the remaining width for navigation, search, and controls. `HeaderActions wrap` lets the actions wrap instead of overflowing a narrow Header.

`ShellSidebar` and `ShellAside` decide when they become rails with `at`. The default is `md` for the Sidebar and `lg` for the Aside. Rails scroll independently and share the shell sticky offset.

## Drawer

A Drawer is split into a panel and one or more triggers. The trigger can live anywhere, so the same panel can be opened from the Header while the panel itself sits in a sidebar rail.

```tsx
<ShellSidebar at="md">
  <Drawer id="docs-menu" label="Documentation" desktop="inline">
    <DocsSidebar />
  </Drawer>
</ShellSidebar>
<DrawerTrigger controls="docs-menu" label="Menu" icon="menu" />
```

`desktop="inline"` turns the panel into normal flow content once the `at` breakpoint is reached, so a single navigation instance serves the mobile Drawer and the desktop rail. The default `desktop="hidden"` removes the Drawer at the breakpoint.

`DrawerTrigger` renders an icon-only menu button by default when `icon="menu"` is set. Content inside the panel is composed by the site; Layouts does not know about Navigation, Search, or TOC.

Import the client entry once for focus management, Escape, backdrop clicks, SPA navigation cleanup, and no-JS `:target` fallback:

```ts
import "@riebeckite/layouts/client";
```

Without JavaScript the trigger is a fragment link, so `#docs-menu` still reveals the panel through `:target`. With JavaScript it becomes a focus-trapped dialog and restores focus when closed.

## Responsive primitives

- `ShowAt min` hides content below a breakpoint; `ShowAt max` hides it at and above the breakpoint.
- `Stack` is a vertical flex container with a shared gap scale.
- `Cluster` is a wrapping horizontal flex container.
- `ResponsiveGrid` uses `repeat(auto-fit, minmax(min(<min>, 100%), 1fr))`, so it adapts to the width of its own container instead of the viewport.
- `ContentContainer size="page"` opts into the page max width.

`ShowAt` and the shell rails use viewport media queries. Grid, Stack, and Cluster respond to the width they are given, which keeps nested narrow containers intact. Layout breakpoints are not exposed as CSS custom properties because media queries cannot read them.

## Breakpoints

| Name | Value | Typical use |
| --- | --- | --- |
| `sm` | `30rem` | Compact phones to small tablets |
| `md` | `48rem` | Sidebar rail replaces the Drawer |
| `lg` | `64rem` | Aside rail |
| `xl` | `88rem` | Wide reading layouts |

The values live only in `@riebeckite/layouts/style.css`. TypeScript accepts the names, never the numbers.

## Ownership

Layouts owns structural placement, rail visibility, Drawer behavior, and generic flex/grid primitives. Navigation, TOC, Search, Color mode, and localization remain in their plugins. Sites compose those components and decide where each one appears at each breakpoint. Site CSS should keep brand expression, not re-implement header alignment, rail switching, or Drawer mechanics.

Every component accepts `class` and `className`. `ShellMain` additionally accepts `id` and `tabindex`; use `id="main-content"` with SPA navigation.
