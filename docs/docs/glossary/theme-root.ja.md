---
title: Theme Root
sidebar:
  hidden: true
---

# Theme Root

Theme Root セレクタ ([data-theme-root] または <html>) はトークンと属性ルールを全ページにスコープし、色調モードとタイポグラフィ属性がここに適用されるとカスケードがすべての要素に届きます。

## セレクタ

すべてのテーマルールはテーマの識別名にスコープされます:

```css
:is(:root, .rb-theme-root)[data-theme-name="<name>"] { /* light */ }
:is(:root, .rb-theme-root)[data-theme-name="<name>"][data-theme="dark"] { /* dark */ }
```

## data 属性

ThemeRoot は `<html>` に次の属性をエミットします:

- `data-theme-name`: テーマ識別子名 (例: "riebeckite", "minimal")
- `data-theme`: 色調モードの状態 ("light" / "dark" / "system" の場合は省略)
- `data-typography`: タイポグラフィ プレセット値
- `data-article-layout`: 記事レイアウト プレセット値

## 関連用語

- [[glossary/theme|Theme]]
- [[design-token|Design Token]]
- [[glossary/color-mode|色調モード]]
- [[glossary/typography|タイポグラフィ]]

## さらに詳しく

- [Theme Root](../framework/theme-system/theme-root.ja.md)
