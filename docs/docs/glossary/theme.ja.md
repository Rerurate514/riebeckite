---
title: Theme
sidebar:
  hidden: true
---

# Theme

ThemeはRiebeckiteサイトのプレゼンテーション層を担い、色、フォント、余白、レイアウト、記事のスタイルを決めます。コンテンツの意味やアプリケーションの構造は変えません。

## Themeの契約

Themeは`@riebeckite/core`の`defineTheme`で作成し、識別子、ファクトリーのオプション、スタイル、共通設定（`colorMode`、`typography`、`articleLayout`、`tokens`、`userCss`）、安全なdata属性の5つを公開します。

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

## Color Mode

Themeは`light`、`dark`、`system`の3つのColor Modeを扱います。
`system`はOSの設定に従い、`data-theme`属性を付けません。
サーバーは`light`または`dark`の場合に`<html>`へ`data-theme`を付けます。
実行時は`document.documentElement.dataset.theme = "dark"`を設定するか、`system`なら属性を削除します。

`data-theme=""`を設定しないでください。空の属性はsystemのメディアクエリを壊します。

## プレゼンテーションの境界

Themeはコンテンツの意味、route、manifest、Pluginの動作、クライアントスクリプトを変更しません。
機能はPluginに、見た目はThemeに、サイトの構造はアプリケーションに割り当てます。
Themeを入れ替えても、コンテンツ、route、Pluginの動作に影響しないようにします。

## 関連用語

- [[design-token|Design Token]]
- [[glossary/color-mode|Color Mode]]
- [[glossary/typography|Typography]]
- [[css-contract|CSS Contract]]
- [[glossary/theme-root|Theme Root]]
- [[presentation-layer|Presentation Layer]]

## さらに詳しく

- [Theme System](../framework/theme-system.ja.md)
