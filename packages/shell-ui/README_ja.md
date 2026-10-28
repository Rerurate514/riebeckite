# @riebeckite/shell-ui

[English](./README.md)

Riebeckite サイト向けの CSS Grid レイアウトプリミティブです。`@riebeckite/shell-ui/style.css` を読み込み、サイト側で `SiteShell`、`ShellHeader`、`ShellBody`、`ShellSidebar`、`ShellMain`、`ShellAside`、`ShellContainer`、`ContentContainer` を組み立てます。レイアウト種別ではなく、コンポーネントの組み合わせで構造を表現します。

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

`ShellContainer` は Header や ShellBody を中央寄せして最大幅を制限します。省略すると viewport 幅を使用します。`ContentContainer` は Main 内の本文だけを制限します。
