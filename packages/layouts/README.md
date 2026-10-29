# @riebeckite/layouts

Composable structural layout primitives for Riebeckite sites. Import `@riebeckite/layouts/style.css` and compose `SiteShell`, `SiteHeader`, `HeaderBrand`, `HeaderActions`, `ShowAt`, `ShellBody`, `ShellSidebar`, `ShellMain`, `ShellAside`, `ContentContainer`, `Drawer`, `DrawerTrigger`, `Stack`, `Cluster`, and `ResponsiveGrid`. Layouts own placement and responsive rails; site code supplies the content.

[日本語](./README_ja.md)

```tsx
<SiteShell>
  <SiteHeader sticky>
    <HeaderBrand>{brand}</HeaderBrand>
    <HeaderActions wrap>
      <ShowAt min="md">{navigation}</ShowAt>
      {search}
      <DrawerTrigger controls="site-menu" label="Menu" icon="menu" />
    </HeaderActions>
  </SiteHeader>
  <ShellBody>
    <ShellSidebar at="md">{sidebarNavigation}</ShellSidebar>
    <ShellMain><ContentContainer>{content}</ContentContainer></ShellMain>
    <ShellAside at="lg">{toc}</ShellAside>
  </ShellBody>
  <Drawer id="site-menu" label="Navigation">{mobileNavigation}</Drawer>
</SiteShell>
```

`ShellSidebar`, `ShellAside`, `Drawer`, and `DrawerTrigger` accept `at` (`sm`, `md`, `lg`, `xl`). `Drawer desktop="inline"` reuses one navigation instance as the mobile panel and the desktop rail.

Import `@riebeckite/layouts/client` once to enable `Drawer` focus handling, Escape, backdrop clicks, SPA cleanup, and the no-JS `:target` fallback.
