---
date: 2026-10-14
title: テーマルート（Theme Root）
sidebar:
  hidden: true
---

# テーマルート（Theme Root）

テーマルートのセレクタ（`.rb-theme-root` または `<html>`）で、トークンと属性のルールをページ全体にスコープします。カラーモードとテーマ設定をここに反映することで、カスケードがすべての要素に届きます。

## セレクタ

すべてのテーマルールは、テーマの識別名にスコープされます。

```css
:is(:root, .rb-theme-root)[data-rb-theme="<name>"] { /* light */ }
:is(:root, .rb-theme-root)[data-rb-theme="<name>"][data-rb-mode="dark"] { /* dark */ }
```

## データ属性

テーマルートは `<html>` に次の属性を出力します。

- `data-rb-theme`：テーマの識別名（例：`"riebeckite"`、`"minimal"`）
- `data-rb-mode`：カラーモードの状態（`"light"` / `"dark"`。`"system"` では省略）
- `data-rb-setting-*`：解決された各テーマ設定（例：`data-rb-setting-typography`）
- `data-rb-layout`：記事レイアウトの値

## ThemeRootのUIコンポーネント
フレームワークは `@riebeckite/honox/ui` の UI プリミティブ `ThemeRoot` を提供し、`<html>` 要素へのテーマ属性の設定を担います。使い方は次のとおりです。
```tsx
import { ThemeRoot } from "@riebeckite/honox/ui";
<ThemeRoot
  theme={config.theme}
  lang={c.get("htmlLanguage") ?? config.site.locale}
>
  {children}
</ThemeRoot>
```
`ThemeRoot` は `lang`、`data-rb-theme`、`data-rb-mode`、`data-rb-layout`、および解決された `data-rb-setting-*` 属性を持つ `<html>` 要素を描画します。

## `<html>`の予約属性
テーマ設定が、フレームワーク予約の `data-rb-mode`、`data-rb-theme`、`data-rb-layout` を上書きすることはありません。カスタムの `<html>` 属性を追加するには、`themeRootAttributes` ヘルパーを直接使います。
```tsx
import { themeRootAttributes } from "@riebeckite/honox/ui";
<html
  lang={c.get("htmlLanguage") ?? config.site.locale}
  {...themeRootAttributes(config.theme)}
  data-custom-attr="..."
>
  ...
</html>
```

## 関連用語

- [[glossary/theme|Theme]]
- [[design-token|Design Token]]
- [[glossary/color-mode|Color Mode]]
- [[glossary/typography|Typography]]

## さらに詳しく

- [Theme Root](../framework/theme-system/theme-root.ja.md)
