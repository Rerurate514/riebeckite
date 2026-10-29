# @riebeckite/layouts

Riebeckite サイト向けの組み合わせ可能な構造レイアウトプリミティブです。`@riebeckite/layouts/style.css` を読み込み、`SiteShell`、`SiteHeader`、`HeaderBrand`、`HeaderActions`、`ShowAt`、`ShellBody`、`ShellSidebar`、`ShellMain`、`ShellAside`、`ContentContainer`、`Drawer`、`DrawerTrigger`、`Stack`、`Cluster`、`ResponsiveGrid` を組み立てます。Layouts は配置とレスポンシブなレールを担当し、サイトやプラグインが内容を描画します。

[English](./README.md)

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

`ShellSidebar`、`ShellAside`、`Drawer`、`DrawerTrigger` は `at`（`sm`、`md`、`lg`、`xl`）を受け取ります。`Drawer desktop="inline"` は1つの Navigation インスタンスをモバイルの panel とデスクトップのレールで兼用します。

Drawer のフォーカス制御、Escape、背景クリック、SPA 遷移時の後始末、JavaScript なしの `:target` フォールバックには `@riebeckite/layouts/client` を一度読み込みます。
