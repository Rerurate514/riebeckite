---
date: 2026-10-14
title: テーマ（Theme）
sidebar:
  hidden: true
---
# テーマ（Theme）
テーマはRiebeckiteサイトの表示層（色、タイポグラフィ、余白、レイアウト、記事スタイル）を担い、コンテンツの意味やアプリケーション構造は変えません。

## テーマの契約

テーマは `@riebeckite/core` の `defineTheme` で作成し、5つの領域を公開します。識別情報、ファクトリのオプション、スタイル、共通設定（`colorMode`、`typography`、`layout`、`tokens`、`stylesheets`）、安全なデータ属性です。

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

## カラーモード

テーマは `light`、`dark`、`system` の3つのカラーモードに対応します。
`system` はOSの設定に従い、`data-rb-mode` 属性を省略します。
サーバーは `light` と `dark` の場合に `<html>` へ `data-rb-mode` を出力します。
実行時は `document.documentElement.dataset.theme = "dark"` を設定するか、`system` なら属性を削除します。

`data-rb-mode=""` を設定しないでください。空の属性はsystemのメディアクエリを壊します。

## 表示の境界

テーマはコンテンツの意味、ルート、マニフェスト、プラグインの動作、クライアントスクリプトを変えません。
機能はプラグインに、見た目はテーマに、サイト構造はアプリケーションに属します。
テーマを入れ替えても、コンテンツ、ルート、プラグインの動作に影響してはいけません。

## テーマ設定の解決

テーマ設定は `packages/core/src/config.ts` の `resolveThemeOptions` で解決されます。この関数は2つのテーマ入力形式を扱います。

- **`ThemeDefinition`**（`styles`、`config`、`attributes` を持つ）：`name` を取り出し、`colorMode`、`typography`、`layout`、`tokens` のために `config` を展開し、`attributes` をマージします。スタイルは `styles` 配列から取ります。
- **`ThemeOptions`**（プレーンオブジェクト）：そのまま使い、不足するフィールドには既定値を適用します。既定値は `colorMode: "system"`、`typography: "system"`、`layout: "article"`、`tokens: {}`、`styles: [defaultThemeStyle]` です。

解決されたテーマは、解決済み設定の `theme` キーに保存され、`name`、`colorMode`、`typography`、`layout`、`tokens`、`attributes`（予約されていない `data-*` 属性だけを許可するようサニタイズ済み）、`stylesheets` を含みます。この解決済みテーマをパイプラインとCSS/HTML生成器が使い、最終的な表示を生成します。

## テーマ名とCSSスコープ
テーマの `name` フィールドは `<html>` の `data-rb-theme` 属性として伝播し、CSSは `:is(:root, .rb-theme-root)[data-rb-theme="<name>"]` セレクタでルールをスコープします。これにより、プレビュー環境で複数のテーマをスタイルの漏れなく並べて描画できます。

## 解決済みテーマの構造
`packages/core/src/config.ts` の `resolveThemeOptions` が返す解決済みテーマオブジェクトには、`name`、`colorMode`、`typography`、`layout`、`tokens`、`attributes`、`stylesheets`、`styles` が含まれます。解決済みテーマは全体の解決済み設定の `theme` キーに保存され、パイプラインとCSS/HTML生成器が使います。

## 関連用語

- [[design-token|Design Token]]
- [[glossary/color-mode|Color Mode]]
- [[glossary/typography|Typography]]
- [[css-contract|CSS の取り決め]]
- [[glossary/theme-root|Theme Root]]
- [[presentation-layer|Presentation Layer]]

## さらに詳しく

- [Theme System](../framework/theme-system.ja.md)
