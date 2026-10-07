---
title: Color Mode
sidebar:
  label: Color Mode
  order: 10
---
# Color Mode

このページは [テーマ作成の詳細](../theme-system.ja.md) の一部で、Color Mode の指定と CSS での扱いを扱います。

## 5. Color Mode

Theme は3種類の Color Mode を扱えます。

```ts id="9qfwqg"
type ThemeColorMode =
  | "light"
  | "dark"
  | "system";
```

| Mode | 動作 |
| --- | --- |
| `light` | Light 配色 |
| `dark` | Dark 配色 |
| `system` | OS の設定に追従 |

Theme は `data-theme` と Semantic Token を使って配色を切り替えます。

個々の Component に Light / Dark の色を直接埋め込まないでください。


## 6. Color Mode の CSS

基本となる CSS は次の形です。

```css id="m87m0s"
/* Light */
:is(:root, .rb-theme-root)
[data-theme-name="<name>"] {
  /* ... */
}

/* Dark */
:is(:root, .rb-theme-root)
[data-theme-name="<name>"]
[data-theme="dark"] {
  /* ... */
}

/* System */
@media (prefers-color-scheme: dark) {
  :is(:root, .rb-theme-root)
  [data-theme-name="<name>"]
  :not([data-theme]) {
    /* ... */
  }
}
```

Server は `colorMode` が `"system"` 以外なら `<html>` に `data-theme` を出力します。

```html id="s6hs50"
<html
  data-theme-name="example"
  data-theme="dark"
>
```

`"system"` の場合は `data-theme` を出力しません。

```html id="k3dd13"
<html data-theme-name="example">
```

この違いは重要です。


## 7. `system` では Attribute を削除する

実行時に Color Mode を変更する場合は、

```text id="h03gwl"
light
  → data-theme="light"

dark
  → data-theme="dark"

system
  → data-theme を削除
```

とします。

たとえば、

```ts id="iyf9ao"
document.documentElement.dataset.theme =
  "dark";
```

から System へ戻す場合は、

```ts id="6t0p0r"
delete document.documentElement.dataset.theme;
```

とします。

次のように空文字へ変更してはいけません。

```ts id="o2i8bp"
document.documentElement.dataset.theme = "";
```

これは、

```html id="25ohm9"
<html data-theme="">
```

となり、依然として `[data-theme]` Selector に一致するためです。

その結果、

```css id="qfrb4j"
:not([data-theme])
```

が成立せず、System Mode の Media Query が機能しません。

`@riebeckite/plugin-color-mode` がこの Contract の参照実装です。
