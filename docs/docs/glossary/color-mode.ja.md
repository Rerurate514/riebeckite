---
date: 2026-10-14
title: カラーモード（Color Mode）
sidebar:
  hidden: true
---

# カラーモード（Color Mode）

`light`、`dark`、`system` のうち、現在有効な配色です。テーマの `colorMode` オプションと `<html>` の `data-rb-mode` 属性で制御し、JavaScript による実行時の切り替えもできます。

## モード

- `light` — ライトパレット
- `dark` — ダークパレット
- `system` — OS の設定に従う（`prefers-color-scheme` メディアクエリ）

サーバーは `light` または `dark` のとき `<html>` に `data-rb-mode` を出力し、`system` のときは属性を出力しません。

```html
<html data-rb-theme="example" data-rb-mode="dark">
---

<html data-rb-theme="example">
```

実行時に `document.documentElement.dataset.rbMode = "dark"` を設定するとダークを強制でき、属性を削除すると `system` に戻ります。

## 実行時の切り替え

`document.documentElement.dataset.rbMode` に `"light"` または `"dark"` を設定してモードを切り替えます。
`system` にするときは `data-rb-mode` 属性を削除し、OS のメディアクエリに任せます。

```ts
document.documentElement.dataset.rbMode = "dark";
delete document.documentElement.dataset.rbMode;
```

`data-rb-mode=""` は設定しないでください。空の属性は `[data-rb-mode]` に一致し、`system` のメディアクエリを壊します。

## テーマ設定
テーマ設定の `colorMode` オプション（`packages/core/src/types/theme_config.ts`）は、`light`、`dark`、`system` のいずれかに解決されます。このオプションは通常、サイト設定で設定します。

```ts
export default defineConfig({
  theme: defaultTheme({
    colorMode: "system",
  }),
});
```

解決された値が `<html>` の `data-rb-mode` 属性と、対応する `--rb-*` の CSS 変数の上書きを決めます。

## `data-rb-mode`と`data-rb-theme`によるCSSの適用
`<html>` 要素は、解決されたモードに基づいて `data-rb-mode` と `data-rb-theme` 属性を受け取ります。

```html
<!-- light mode -->
<html data-rb-theme="riebeckite" data-rb-mode="light">

<!-- dark mode -->
<html data-rb-theme="riebeckite" data-rb-mode="dark">

<!-- system mode (no data-rb-mode attribute) -->
<html data-rb-theme="riebeckite">
```

- `data-rb-mode`（`"light"` または `"dark"`）は、`[data-rb-mode="light"]` と `[data-rb-mode="dark"]` のルールでカラーパレットを切り替えるために CSS が使います。
- `data-rb-theme` は、有効なテーマを表す自由形式の識別子（例：`"riebeckite"`）で、テーマ固有のスタイルを対象にするために使います。

## 関連用語

- [[glossary/theme|Theme]]
- [[design-token|Design Token]]
- [[semantic-token|Semantic Token]]
- [[presentation-layer|Presentation Layer]]

## さらに詳しく

- [Color Mode](../framework/theme-system/color-mode.ja.md)
