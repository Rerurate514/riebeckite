---
title: Color Mode
sidebar:
  hidden: true
---

# Color Mode

Color Modeは`light`、`dark`、`system`の3つの配色です。`colorMode`オプションと`<html>`の`data-theme`属性で制御し、JavaScriptで実行時に切り替えられます。

## モード

- `light`：ライトパレット
- `dark`：ダークパレット
- `system`：OSの設定に従います（`prefers-color-scheme`メディアクエリ）

サーバーは`light`または`dark`のとき`<html>`に`data-theme`を付けます。`system`のときは属性を付けません。

```html
<html data-theme-name="example" data-theme="dark">
---

<html data-theme-name="example">
```

実行時は`document.documentElement.dataset.theme = "dark"`でダークを強制できます。属性を削除すると`system`に戻り、OSのメディアクエリが有効になります。

## ランタイム切り替え

`document.documentElement.dataset.theme`に`"light"`または`"dark"`を設定してモードを切り替えます。`system`にするときは`data-theme`属性を削除し、OSのメディアクエリを有効にします。

```ts
document.documentElement.dataset.theme = "dark";
delete document.documentElement.dataset.theme;
```

`data-theme=""`は設定しないでください。空の属性は`[data-theme]`に一致し、`system`のメディアクエリを壊します。

## 関連用語

- [[glossary/theme|Theme]]
- [[design-token|Design Token]]
- [[semantic-token|Semantic Token]]
- [[presentation-layer|Presentation Layer]]

## さらに詳しく

- [Color Mode](../framework/theme-system/color-mode.ja.md)
