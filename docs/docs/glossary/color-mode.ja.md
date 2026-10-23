---
date: 2026-10-14
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

## Theme Config
テーマ設定の`colorMode`オプション（`packages/core/src/types/theme_config.ts`）は、`light`、`dark`、`system`のいずれかに解決されます。このオプションはVite設定やThemeファイルで通常設定されます：

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { reiebeckite } from '@riebeckite/honox'

export default defineConfig({
  plugins: [
    reiebeckite({
      colorMode: 'dark', // または 'light' か 'system'
    }),
  ],
}
```

解決された値は`<html>`の`data-theme`属性と対応する`--rb-*`CSS変数オーバーライドを駆動します。

## `data-theme`/`data-theme-name`CSS Adaptation
`<html>`要素は解決されたモードに基づいて`data-theme`と`data-theme-name`属性を受け取ります：

```html
<!-- light mode -->
<html data-theme-name="riebeckite" data-theme="light">

<!-- dark mode -->
<html data-theme-name="riebeckite" data-theme="dark">

<!-- system mode (no data-theme attribute) -->
<html data-theme-name="riebeckite">
```

- `data-theme`(`"light"`または`"dark"`)は、`[data-theme="light"]`および`[data-theme="dark"]`ルールによってカラーパレットを切り替えるために使用されます。
- `data-theme-name`は、アクティブなThemeを識別する自由形式の識別子（例：`"riebeckite"`）で、Theme固有のスタイルをターゲットにするために使用されます。



## 関連用語

- [[glossary/theme|Theme]]
- [[design-token|Design Token]]
- [[semantic-token|Semantic Token]]
- [[presentation-layer|Presentation Layer]]

## さらに詳しく

- [Color Mode](../framework/theme-system/color-mode.ja.md)
