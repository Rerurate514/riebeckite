---
date: 2026-10-14
title: テーマ（Theme）
sidebar.hidden: true
---
# テーマ（Theme）
テーマはRiebeckiteサイトの表示層（色、タイポグラフィ、余白、レイアウト、記事スタイル）を担い、コンテンツの意味やアプリケーション構造は変えません。

## テーマの契約

テーマは `@riebeckite/core` の `defineTheme` で作成します。定義は、識別情報（`name`）、スタイル（`styles`）、任意の設定スキーマ（`settings`）、任意の名前付きプリセット（`presets`）から成ります。

```ts
import { defineTheme, defineThemeSettings } from "@riebeckite/core";

export const exampleTheme = defineTheme({
  name: "example",
  styles: [{ moduleSpecifier: "@riebeckite/theme-example/style.css" }],
  settings: defineThemeSettings({
    accent: { type: "color", label: "Accent", default: "#176b5a" },
  }),
});
```

## カラーモード

テーマは `light`、`dark`、`system` の3つのカラーモードに対応します。
`system` は OS の設定に従い、`data-rb-mode` 属性を省略します。
サーバーは `light` と `dark` の場合に `<html>` へ `data-rb-mode` を出力します。
実行時は `document.documentElement.dataset.rbMode = "dark"` を設定するか、`system` なら属性を削除します。

`data-rb-mode=""` を設定しないでください。空の属性は system のメディアクエリを壊します。

## 表示の境界

テーマはコンテンツの意味、ルート、マニフェスト、プラグインの動作、クライアントスクリプトを変えません。
機能はプラグインに、見た目はテーマに、サイト構造はアプリケーションに属します。
テーマを入れ替えても、コンテンツ、ルート、プラグインの動作に影響してはいけません。

## テーマ設定の解決

テーマ設定は `packages/core/src/types/theme_config.ts` の `resolveTheme` で解決されます。`resolveConfig` が、設定されたテーマインスタンスとフォールバック定義を渡して呼び出します。解決では次の処理を行います。

- `options.preset` を参照し、未知の名前ならエラーにする
- プリセットの設定と明示的な `settings` をマージする
- テーマの設定スキーマに対して検証し、既定値を適用する
- `colorMode`（既定 `system`）、`layout`（既定 `article`）、`styles`、`stylesheets` を解決する

解決済みテーマは解決済み設定の `theme` キーに保存され、`name`、`colorMode`、`layout`、`styles`、`stylesheets`、`settings` を含みます。`settings` には解決済みの `values`、反映用の `attributes`、生成された `style` が入ります。

## テーマ名とCSSスコープ

テーマの `name` フィールドは `<html>` の `data-rb-theme` 属性として伝播し、CSS は `:is(:root, .rb-theme-root)[data-rb-theme="<name>"]` セレクタでルールをスコープします。これにより、プレビュー環境で複数のテーマをスタイルの漏れなく並べて描画できます。

## 関連用語

- [[design-token|Design Token]]
- [[glossary/color-mode|Color Mode]]
- [[glossary/typography|Typography]]
- [[css-contract|CSS の取り決め]]
- [[glossary/theme-root|Theme Root]]
- [[presentation-layer|Presentation Layer]]

## さらに詳しく

- [Theme System](../framework/theme-system.ja.md)
