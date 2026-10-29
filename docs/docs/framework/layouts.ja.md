---
title: Layouts
---

# Layouts

`@riebeckite/layouts` は組み合わせ可能な構造レイアウトプリミティブです。Grid の配置、レスポンシブなレール表示、Sticky offset、レールごとのスクロール、Header のグループ化、Drawer の操作を担当します。Theme は視覚トークンを提供し、Navigation と TOC の内容は各プラグインが描画します。

```tsx
import { ContentContainer, HeaderActions, HeaderBrand, ShellAside, ShellBody, ShellMain, ShellSidebar, SiteHeader, SiteShell } from "@riebeckite/layouts";

<SiteShell>
  <SiteHeader sticky>
    <HeaderBrand>{brand}</HeaderBrand>
    <HeaderActions>{actions}</HeaderActions>
  </SiteHeader>
  <ShellBody>
    <ShellSidebar>{navigation}</ShellSidebar>
    <ShellMain><ContentContainer>{children}</ContentContainer></ShellMain>
    <ShellAside>{toc}</ShellAside>
  </ShellBody>
</SiteShell>
```

Header は `ContentContainer` とは独立して viewport 幅まで広がります。`HeaderBrand` は左側に置かれ、`HeaderActions` は残りの幅で Navigation、Search、操作要素を右側に配置します。`48rem` から Sidebar が Drawer を置き換え、`64rem` から Aside を追加します。Sidebar と Aside は共通の Sticky offset を使い、独立してスクロールします。

`Drawer` はボタンとフォーカス管理された dialog panel を描画します。client entry を一度読み込みます。

```ts
import "@riebeckite/layouts/client";
```

すべてのコンポーネントは `class` と `className` を受け取ります。`ShellMain` は `id` と `tabindex` も受け取ります。SPA ナビゲーションでは `id="main-content"` を使います。
