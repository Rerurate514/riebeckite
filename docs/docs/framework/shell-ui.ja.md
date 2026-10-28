---
title: Shell UI
---

# Shell UI

`@riebeckite/shell-ui` は組み合わせ可能なサイトレイアウト用プリミティブです。Grid の配置とセマンティックトークンはこのパッケージが持ち、Theme は CSS 値だけを上書きします。

```tsx
import { ShellAside, ShellBody, ShellHeader, ShellMain, ShellSidebar, SiteShell } from "@riebeckite/shell-ui";
import { SidebarNavigation } from "@riebeckite/plugin-navigation";

<SiteShell variant="docs">
  <ShellHeader sticky>...</ShellHeader>
  <ShellBody>
    <ShellSidebar><SidebarNavigation items={items} searchable autoExpandActive /></ShellSidebar>
    <ShellMain>{children}</ShellMain>
    <ShellAside><TableOfContents /></ShellAside>
  </ShellBody>
</SiteShell>
```

`docs` は Header、Sidebar、Main、TOC を配置します。`wiki` は Aside を省き、`blog` は中央寄せの Main、`dashboard` は同じ Grid にアプリケーションコンテンツを置く構成です。`ShellDrawer` は native details を使うモバイル向けのフォールバックです。

`SiteNav` は Header や Footer の短いサイトナビゲーション用です。深いドキュメントツリーには、階層ごとの開閉、アクティブな祖先の展開、アクセシブルなトグル、長いラベル、任意のフィルター検索を備える `SidebarNavigation` を使います。フィルターは表示済み項目だけを対象とし、全文検索の代わりにはなりません。
