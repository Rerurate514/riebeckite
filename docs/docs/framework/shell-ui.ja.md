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

Docs は Header、Sidebar、Main、TOC を組み合わせ、Wiki では Aside を省きます。Blog は Header と Body を `ShellContainer` で包んで中央寄せにし、Dashboard は同じ Grid にアプリケーションコンテンツを置きます。`ShellContainer` は Shell の最大幅を、`ContentContainer` は Main 内の本文幅を制限します。`ShellDrawer` はモバイル向けのドロワーで、開閉ボタンと、初期状態では非表示のパネルを描画します。

`SiteNav` は Header や Footer の短いサイトナビゲーション用です。深いドキュメントツリーには、階層ごとの開閉、アクティブな祖先の展開、アクセシブルなトグル、長いラベル、任意のフィルター検索を備える `SidebarNavigation` を使います。フィルターは表示済み項目だけを対象とし、全文検索の代わりにはなりません。

## コンポーネント

すべてのコンポーネントは `class` と `className` を受け取り、自身のクラスに追加します。`children` は要素の内側に描画されます。

| コンポーネント | 要素 | Props |
| --- | --- | --- |
| `SiteShell` | `div.rb-shell` | なし |
| `ShellContainer` | `div.rb-shell__container` | なし |
| `ContentContainer` | `div.rb-content-container` | なし |
| `ShellHeader` | `header.rb-shell__header` | `sticky?: boolean`（`data-rb-shell-sticky` を設定） |
| `ShellBody` | `div.rb-shell__body` | なし |
| `ShellSidebar` | `aside.rb-shell__sidebar` | `collapsible?: boolean`（`data-rb-shell-collapsible` を設定） |
| `ShellMain` | `main.rb-shell__main` | `id?: string`、`tabindex?: number` |
| `ShellAside` | `aside.rb-shell__aside` | なし |
| `ShellDrawer` | `div.rb-shell__drawer` | `label?: string`、`icon?: "menu"` |
| `SiteBrand` | `div.rb-shell__brand` | なし |

SPA ナビゲーションを有効にする場合は、`ShellMain` に `id="main-content"` を設定します。

## Drawer

`label` は開閉ボタンの文言で、既定値は `"Navigation"` です。`icon: "menu"` を指定すると、文言の代わりにハンバーガーアイコンを表示します。このとき `label` はボタンの `aria-label` になります。

```tsx
<ShellHeader sticky>
  <SiteBrand>Docs</SiteBrand>
  <ShellDrawer icon="menu" label="Navigation"><DocsSidebar /></ShellDrawer>
</ShellHeader>
```

開閉、Escape での終了、フォーカスの移動、外側クリックでの終了は client エントリが担当します。次の import を一度だけ追加してください。

```ts
import "@riebeckite/shell-ui/client";
```

幅が `48rem` 以上の画面ではドロワーは非表示になり、Sidebar が使われます。
