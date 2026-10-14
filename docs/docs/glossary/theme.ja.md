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

## Theme設定の解決

`resolveThemeConfig`は`packages/core/src/config.ts`でテーマ設定を解決します。この関数は2つのテーマ入力形式を扱います：

- **`RiebeckiteTheme`**（`styles`、`config`、`attributes`を持つ）: `name`を抽出し、`colorMode`、`typography`、`articleLayout`、`tokens`用に`config`を展開し、`attributes`をマージします。スタイルは`styles`配列から取られます。
- **`ThemeConfig`**（プレーンオブジェクト）: 不足しているフィールドにデフォルトが適用されます。デフォルトには`colorMode: "system"`、`typography: "system"`、`articleLayout: "article"`、`tokens: {}`、`styles: [defaultThemeStyle]`が含まれます。

解決されたテーマは、解決されたconfigの下に`theme`キーとしてマージされ、`name`、`colorMode`、`typography`、`articleLayout`、`tokens`、`attributes`（`data-*`属性のみ許可されるようサニタイズされた）と`userCss`を含みます。その後、テーマはパイプラインとCSS/HTMLジェネレータによって最終的なプレゼンテーションを生成するために消費されます。

## Theme名とCSSスコープ
Themeの`name`フィールドが`<html>`の`data-theme-name`属性として伝播し、CSSは`:is(:root, .rb-theme-root)[data-theme-name="<name>"]`セレクターでルールをスコープします。これにより、プレビュー環境で複数のThemeがスタイル漏れなく横並びにレンダリングされます。

## 解決済みThemeの構造
`packages/core/src/config.ts`の`resolveThemeConfig`によって得られる解決されたThemeオブジェクトには、`name`、`colorMode`、`typography`、`articleLayout`、`tokens`、`attributes`、`userCss`、`styles`が含まれます。この解決されたThemeは、解決されたconfigの下の`theme`キーに格納され、パイプラインとCSS/HTMLジェネレータによって消費されます。

## 関連用語

- [[design-token|Design Token]]
- [[glossary/color-mode|Color Mode]]
- [[glossary/typography|Typography]]
- [[css-contract|CSS Contract]]
- [[glossary/theme-root|Theme Root]]
- [[presentation-layer|Presentation Layer]]
- [Theme System](../framework/theme-system.ja.md)

## さらに詳しく

- [Theme System](../framework/theme-system.ja.md)