# @riebeckite/shell-ui

Composable, CSS Grid layout primitives for Riebeckite sites. Import `@riebeckite/shell-ui/style.css`, then compose `SiteShell`, `ShellHeader`, `ShellBody`, `ShellSidebar`, `ShellMain`, `ShellAside`, and `ShellDrawer`. Layout placement remains owned by the site.

## Recipes

```tsx
<SiteShell variant="docs">
  <ShellHeader sticky><SiteNav /><ShellDrawer label="Documentation"><DocsSidebar /></ShellDrawer></ShellHeader>
  <ShellBody><ShellSidebar><DocsSidebar /></ShellSidebar><ShellMain id="main-content"><ArticleContent /></ShellMain><ShellAside><TableOfContents /></ShellAside></ShellBody>
</SiteShell>
```

```tsx
<SiteShell variant="wiki">
  <ShellHeader sticky><SiteBrand>Wiki</SiteBrand></ShellHeader>
  <ShellBody><ShellSidebar><WikiNavigation /></ShellSidebar><ShellMain><WikiArticle /></ShellMain><ShellAside><Backlinks /></ShellAside></ShellBody>
</SiteShell>
```

```tsx
<SiteShell variant="blog">
  <ShellHeader sticky><SiteNav /></ShellHeader>
  <ShellBody><ShellMain><ArticleContent /></ShellMain></ShellBody>
</SiteShell>
```

```tsx
<SiteShell variant="dashboard">
  <ShellHeader sticky><SiteBrand>Dashboard</SiteBrand></ShellHeader>
  <ShellBody><ShellSidebar><DashboardNavigation /></ShellSidebar><ShellMain><DashboardContent /></ShellMain><ShellAside><ActivityFeed /></ShellAside></ShellBody>
</SiteShell>
```
