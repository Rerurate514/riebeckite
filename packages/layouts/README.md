# @riebeckite/layouts

Composable structural layout primitives for Riebeckite sites. Import `@riebeckite/layouts/style.css` and compose `SiteShell`, `SiteHeader`, `HeaderBrand`, `HeaderActions`, `ShellBody`, `ShellSidebar`, `ShellMain`, `ShellAside`, `ContentContainer`, and `Drawer`. Layouts own placement and responsive rails; site code supplies the content.

[日本語](./README_ja.md)

```tsx
<SiteShell>
  <SiteHeader sticky>
    <HeaderBrand>{brand}</HeaderBrand>
    <HeaderActions>{actions}</HeaderActions>
  </SiteHeader>
  <ShellBody>
    <ShellSidebar>{navigation}</ShellSidebar>
    <ShellMain><ContentContainer>{content}</ContentContainer></ShellMain>
    <ShellAside>{toc}</ShellAside>
  </ShellBody>
</SiteShell>
```

Import `@riebeckite/layouts/client` once to enable `Drawer` focus handling.
