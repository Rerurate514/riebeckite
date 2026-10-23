---
date: 2026-10-14
title: テーマルート（Theme Root）
sidebar:
  hidden: true
---

# テーマルート（Theme Root）

テーマルートのセレクタ（`[data-theme-root]` または `<html>`）で、トークンと属性のルールをページ全体にスコープします。カラーモードとタイポグラフィの属性をここに付けることで、カスケードがすべての要素に届きます。

## セレクタ

すべてのテーマルールは、テーマの識別名にスコープされます。

```css
:is(:root, .rb-theme-root)[data-theme-name="<name>"] { /* light */ }
:is(:root, .rb-theme-root)[data-theme-name="<name>"][data-theme="dark"] { /* dark */ }
```

## データ属性

テーマルートは `<html>` に次の属性を出力します。

- `data-theme-name`：テーマの識別名（例：`"riebeckite"`、`"minimal"`）
- `data-theme`：カラーモードの状態（`"light"` / `"dark"`。`"system"` では省略）
- `data-typography`：タイポグラフィのプリセット値
- `data-article-layout`：記事レイアウトのプリセット値

## ThemeRootのUIコンポーネント
フレームワークは `@riebeckite/honox/ui` のUIプリミティブ `ThemeRoot` を提供し、`<html>` 要素へのテーマ属性の設定を担います。使い方は次のとおりです。
```tsx
import { ThemeRoot } from "@riebeckite/honox/ui";
<ThemeRoot
  theme={config.theme}
  lang={c.get("htmlLanguage") ?? config.site.locale}
>
  {children}
</ThemeRoot>
```
`ThemeRoot` は `lang`、`data-theme-name`、`data-theme`、`data-typography`、`data-article-layout` 属性を持つ `<html>` 要素を描画します。

## `<html>`の予約属性
フレームワークが予約する `data-theme`、`data-theme-name`、`data-typography`、`data-article-layout` は、テーマの `attributes` で上書きできません。カスタムの `<html>` 属性を追加するには、`themeRootAttributes` ヘルパーを直接使います。
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
