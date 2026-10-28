# @riebeckite/shell-ui

[日本語](./README_ja.md)

Composable, CSS Grid layout primitives for Riebeckite sites. Import `@riebeckite/shell-ui/style.css`, then compose `SiteShell`, `ShellHeader`, `ShellBody`, `ShellSidebar`, `ShellMain`, `ShellAside`, `ShellContainer`, `ContentContainer`, and `ShellDrawer`. The chosen component combination, rather than a layout variant, owns placement.

## Recipes

```tsx
<SiteShell>
  <ShellHeader sticky><SiteNav /><ShellDrawer label="Documentation"><DocsSidebar /></ShellDrawer></ShellHeader>
  <ShellBody><ShellSidebar><DocsSidebar /></ShellSidebar><ShellMain id="main-content"><ContentContainer><ArticleContent /></ContentContainer></ShellMain><ShellAside><TableOfContents /></ShellAside></ShellBody>
</SiteShell>
```

```tsx
<SiteShell>
  <ShellHeader sticky><SiteBrand>Wiki</SiteBrand></ShellHeader>
  <ShellBody><ShellSidebar><WikiNavigation /></ShellSidebar><ShellMain><ContentContainer><WikiArticle /></ContentContainer></ShellMain></ShellBody>
</SiteShell>
```

```tsx
<SiteShell>
  <ShellHeader sticky><ShellContainer><SiteNav /></ShellContainer></ShellHeader>
  <ShellContainer><ShellBody><ShellMain><ContentContainer><ArticleContent /></ContentContainer></ShellMain></ShellBody></ShellContainer>
</SiteShell>
```

```tsx
<SiteShell>
  <ShellHeader sticky><SiteBrand>Dashboard</SiteBrand></ShellHeader>
  <ShellBody><ShellSidebar><DashboardNavigation /></ShellSidebar><ShellMain><DashboardContent /></ShellMain><ShellAside><ActivityFeed /></ShellAside></ShellBody>
</SiteShell>
```
