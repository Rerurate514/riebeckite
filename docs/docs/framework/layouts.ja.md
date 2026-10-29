---
title: レイアウト
---

# レイアウト

Riebeckite は UI フレームワークではなく、Markdown 中心の静的サイトフレームワークです。Markdown、プリセット、設定から始め、出力は標準 HTML、CSS、JSX でカスタマイズします。ほとんどのサイトで `@riebeckite/layouts` は必要ありません。

## 標準的なサイト構造

セマンティックな要素を使い、レスポンシブのルールはサイト CSS で管理します。

```tsx
<header class="site-header">{navigation}</header>
<div class="site-layout">
  <aside class="site-sidebar">{sidebar}</aside>
  <main id="main-content" tabindex={-1} class="site-main">{children}</main>
  <aside class="site-aside">{toc}</aside>
</div>
<footer>{footer}</footer>
```

```css
.site-layout { display: grid; }
.site-sidebar, .site-aside { display: none; }
@media (min-width: 48rem) { .site-sidebar { display: block; } }
@media (min-width: 64rem) { .site-layout { grid-template-columns: 18rem minmax(0, 1fr) 16rem; } .site-aside { display: block; } }
```

DOM、ブレークポイント、見た目はサイト側で決めます。テーマはトークンを提供し、プラグインはコンテンツを提供します。どちらにもレイアウトコンポーネントは必要ありません。

## 任意の Drawer

モバイルナビゲーションにアクセシブルな対話動作が必要な場合だけ `@riebeckite/layouts` を使います。

```tsx
import { Drawer, DrawerTrigger } from "@riebeckite/layouts";
import "@riebeckite/layouts/style.css";

<header class="site-header">
  <DrawerTrigger controls="site-menu" label="Menu" icon="menu" />
</header>
<Drawer id="site-menu" label="Navigation">{navigation}</Drawer>
```

フォーカス制御、Escape、背景クリック、SPA 遷移時の後始末にはクライアントエントリを一度読み込みます。

```ts
import "@riebeckite/layouts/client";
```

JavaScript がない場合もフラグメントリンクと `:target` でパネルを開けます。コンポーネントは `data-rb-drawer`、`data-rb-drawer-backdrop`、`data-rb-drawer-panel`、`data-rb-drawer-trigger`、`data-rb-drawer-target` を出力します。配置は `--rb-drawer-inset-block-start`、`--rb-drawer-width`、`--rb-drawer-padding`、`--rb-drawer-background` で調整できます。
