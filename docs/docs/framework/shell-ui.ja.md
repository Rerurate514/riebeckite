---
title: Shell UI
---

# Shell UI

`@riebeckite/shell-ui` は組み合わせ可能なサイトレイアウト用プリミティブです。Grid の配置、スクロール、Sticky、セマンティックトークンはこのパッケージが持ち、Theme は CSS 値だけを上書きします。レイアウトは `SiteShell` の variant ではなく、コンポーネントの組み合わせで表現します。

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

Docs は Header、Sidebar、Main、TOC を組み合わせ、Wiki では Aside を省きます。Blog は Header と Body を `ShellContainer` で包んで中央寄せにし、Dashboard は同じ Grid にアプリケーションコンテンツを置きます。`ShellContainer` は Shell の最大幅を、`ContentContainer` は Main 内の本文幅を制限します。`ShellDrawer` は native details を使うモバイル向けのフォールバックです。

`SiteNav` は Header や Footer の短いサイトナビゲーション用です。深いドキュメントツリーには、階層ごとの開閉、アクティブな祖先の展開、アクセシブルなトグル、長いラベル、任意のフィルター検索を備える `SidebarNavigation` を使います。フィルターは表示済み項目だけを対象とし、全文検索の代わりにはなりません。
