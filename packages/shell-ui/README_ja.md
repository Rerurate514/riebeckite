# @riebeckite/shell-ui

[English](./README.md)

Riebeckite サイト向けの CSS Grid レイアウトプリミティブです。`@riebeckite/shell-ui/style.css` を読み込み、サイト側で `SiteShell`、`ShellHeader`、`ShellHeaderContent`、`ShellBody`、`ShellSidebar`、`ShellMain`、`ShellAside`、`ShellContainer`、`ContentContainer` を組み立てます。レイアウト種別ではなく、コンポーネントの組み合わせで構造を表現します。

## Recipe

```tsx
<SiteShell>
  <ShellHeader sticky>...</ShellHeader>
  <ShellBody>
    <ShellSidebar><SidebarNavigation items={items} searchable /></ShellSidebar>
    <ShellMain><ContentContainer>{children}</ContentContainer></ShellMain>
    <ShellAside><TableOfContents /></ShellAside>
  </ShellBody>
</SiteShell>
```

Header の内容を利用可能な幅まで広げるときは、`ShellContainer` 内で `ShellHeaderContent` を使います。`ContentContainer` は Main 内の本文だけを制限します。
