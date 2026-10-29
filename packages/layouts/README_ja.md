# @riebeckite/layouts

Riebeckite サイトで任意に使えるアクセシブルな Drawer 機能です。ヘッダー、ページグリッド、余白、レスポンシブ表示は標準 HTML とサイト所有の CSS で実装します。

[English](./README.md)

```tsx
import { Drawer, DrawerTrigger } from "@riebeckite/layouts";
import "@riebeckite/layouts/style.css";

<header class="site-header">
  <a href="/">My site</a>
  <DrawerTrigger controls="site-menu" label="Menu" icon="menu" />
</header>
<main id="main-content">{children}</main>
<Drawer id="site-menu" label="Navigation">{navigation}</Drawer>
```

フォーカス制御、Escape、背景クリック、SPA 遷移時の後始末には `@riebeckite/layouts/client` を一度読み込みます。JavaScript がない場合もトリガーはフラグメントリンクとして動作し、`:target` でパネルを開けます。

`Drawer` は `data-rb-drawer`、`data-rb-drawer-backdrop`、`data-rb-drawer-panel` を出力します。`DrawerTrigger` は `data-rb-drawer-trigger` と `data-rb-drawer-target` を出力します。サイト CSS では `--rb-drawer-inset-block-start`、`--rb-drawer-width`、`--rb-drawer-padding`、`--rb-drawer-background` を設定できます。
