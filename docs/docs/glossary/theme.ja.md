---
title: Theme
sidebar:
  hidden: true
---

# Theme

Theme は Riebeckite サイトのプレゼンテーション層を制御し、色、フォント、間隔、レイアウト、記事のスタイルを決定します。コンテンツの意味論やアプリケーション構造を変更しません。

## Theme コントラクト

Theme は `@riebeckite/core` の `defineTheme` で作成され、識別子、ファクトリーオプション、スタイル、共通設定 (`colorMode`, `typography`, `articleLayout`, `tokens`, `userCss`)、および安全な data 属性の5つの領域を公開します。

```ts
import { defineTheme } from "@riebeckite/core";
export function exampleTheme() {
  return defineTheme({
    name: "example",
    options: {},
    styles: [{ moduleSpecifier: "@riebeckite/theme-example/style.css" }],
    attributes: { "data-example-flag": "on" },
  });
}
```

## 色調モード

テーマは `light`, `dark`, `system` の3つの色調モードをサポートします。
`system` は OS の設定に従い `data-theme` 属性を付与しません。
サーバーは `light` または `dark` モードの場合、 `<html>` に `data-theme` を付与します。
ランタイムでは `document.documentElement.dataset.theme = "dark"` と設定するか、 `system` の場合は属性を削除します。

`data-theme=""` を設定しないでください — 空の属性は system メディアクエリを壊します。

## プレゼンテーションの境界

Theme はコンテンツの意味論、ルート、マニフェスト、プラグインの動作、クライアントスクリプトを変更しません。
機能はプラグインに、外観はテーマに、サイト構造はアプリケーションに割り当てられます。
テーマを入れ替えてもコンテンツ、ルート、プラグインの動作に影響しない必要があります。

## 関連用語

- [[design-token|Design Token]]
- [[glossary/color-mode|色調モード]]
- [[glossary/typography|タイポグラフィ]]
- [[css-contract|CSS コントラクト]]
- [[glossary/theme-root|Theme Root]]
- [[presentation-layer|プレゼンテーション層]]

## さらに詳しく

- [Theme System](../framework/theme-system.ja.md)
