---
date: 2026-10-08
title: カラーモード
sidebar:
  label: カラーモード
  order: 10
---
# カラーモード

このページは[テーマ作成の詳細](../theme-system.ja.md)の一部で、カラーモードを扱います。

## 3-1. カラーモード（colorMode）

```ts id="9qfwqg"
type ThemeColorMode =
  | "light"
  | "dark"
  | "system";
```

| モード | 動作 |
| --- | --- |
| `light` | ライト配色 |
| `dark` | ダーク配色 |
| `system` | OSの設定に追従 |

`"system"` はOSの設定に追従します。テーマは `data-rb-mode` 属性とセマンティックトークンを使い、個々のコンポーネントに色を直接埋め込まないようにします。

サーバーは、カラーモードが `"system"` でない限り `<html>` に `data-rb-mode` を出力します。

```html id="s6hs50"
<html
  data-rb-theme="example"
  data-rb-mode="dark"
>
```

`"system"` のときは、この属性をまったく出力しません。

```html id="k3dd13"
<html data-rb-theme="example">
```

この違いは重要です。実行時の配色は、次の3つのCSS状態で決まります。

```css id="m87m0s"
/* Light */
:is(:root, .rb-theme-root)[data-rb-theme="<name>"] {
  /* ... */
}

/* Dark */
:is(:root, .rb-theme-root)[data-rb-theme="<name>"][data-rb-mode="dark"] {
  /* ... */
}

/* System */
@media (prefers-color-scheme: dark) {
  :is(:root, .rb-theme-root)[data-rb-theme="<name>"]:not([data-rb-mode]) {
    /* ... */
  }
}
```

`colorMode` が `"system"` のとき、サーバーはこの属性を出力せず、メディアクエリが配色を決めます。

**実行時の切り替えの取り決め**：`document.documentElement.dataset.theme` に `"light"` または `"dark"` を設定するか、`"system"` にする場合は属性を削除します。

```text id="h03gwl"
light
  → data-rb-mode="light"

dark
  → data-rb-mode="dark"

system
  → data-rb-mode を削除
```

ダークへ切り替えるには、次のように設定します。

```ts id="iyf9ao"
document.documentElement.dataset.theme =
  "dark";
```

システムへ戻すときは、属性を削除します。

```ts id="6t0p0r"
delete document.documentElement.dataset.theme;
```

`data-rb-mode=""` のように空文字を設定してはいけません。

```ts id="o2i8bp"
document.documentElement.dataset.theme = "";
```

空の属性でも `[data-rb-mode]` に一致します。

```html id="25ohm9"
<html data-rb-mode="">
```

そのため、`:not([data-rb-mode])` が成立しなくなり、システム用のメディアクエリが機能しません。

`@riebeckite/plugin-color-mode` はこの取り決めの参照実装です（パッケージのREADMEを参照）。レンダリング前に実行されるインラインスクリプト `ColorModeScript`、`ColorModeToggle` コントロール、選択内容を `localStorage` に保存する `initColorMode` クライアントエントリで構成されています。
