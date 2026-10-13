---
title: 色調モード
sidebar:
  hidden: true
---

# 色調モード

light, dark, system の3つからなるアクティブな色調 scheme。theme の `colorMode` オプションと `<html>` の `data-theme` 属性で制御され、JavaScript を使ったランタイム切り替えが可能です。

## モード

`light` — ライト パレット
`dark` — ダーク パレット
`system` — OS の設定に従う (prefers-color-scheme メディアクエリ)

サーバーは `light` または `dark` の場合、 `<html>` に `data-theme` を付与します。 `system` の場合は属性を付与しません。

```html
<html data-theme-name="example" data-theme="dark">
---

<html data-theme-name="example">
```

ランタイムでは: `document.documentElement.dataset.theme = "dark"` でダークを強制し、属性を削除して system にすると OS のメディアクエリが有効になります。

## ランタイム切り替え

`document.documentElement.dataset.theme = "light"` または `"dark"` でモードを切り替えます。
`system` モードの場合は `data-theme` 属性を削除して OS メディアクエリが有効になるようにします。

```ts
document.documentElement.dataset.theme = "dark";
delete document.documentElement.dataset.theme;
```

`data-theme=""` を設定しないでください — 空の属性は [data-theme] に一致し、system メディアクエリを壊します。

## 関連用語

- [[glossary/theme|Theme]]
- [[design-token|Design Token]]
- [[semantic-token|セマンティック トークン]]
- [[presentation-layer|プレゼンテーション層]]

## さらに詳しく

- [Color Mode](../framework/theme-system/color-mode.ja.md)
