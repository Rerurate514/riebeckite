# @riebeckite/plugin-toc

scroll-spy 付き table of contents 描画: 記事の HTML から見出しを抽出し、
現在表示中の section をハイライトします。

[English](./README_en.md)

## 概要

`toc()` は記事の見出し `h2`–`h4` のうち `id` を持つものを nested list で
描画する `TableOfContents` component を提供します。`initTableOfContents` は
client entry で、scroll を追跡して link を読み済みにし、現在の見出しの
link に `aria-current` を設定します。

抽出した item が 2 件未満の場合は何も描画しません。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { tocPlugin } from "@riebeckite/plugin-toc";

export default defineConfig({
  // ...
  plugins: [tocPlugin()],
});
```

`tocPlugin()` は plugin を登録し、`style.css` を bundle し、client entry と
して `initTableOfContents` を宣言します。

### Component の描画

```tsx
import TableOfContents, {
  extractTableOfContents,
} from "@riebeckite/plugin-toc";

const items = extractTableOfContents(post.html ?? "");

// route 内で
return (
  <Article
    asideContent={
      <TableOfContents className="table-of-contents--desktop" items={items} />
    }
  />
);
```

client entry は各 link が持つ `data-toc-target` 属性で要素を見つけるため、
複数の ToC（desktop/mobile）を描画しても正しく動作します。

## API

- `extractTableOfContents(html)` — `id` を持つ `h2`–`h4` を見出しとして
  `TableOfContentsItem[]` を抽出。inline HTML を除去し entity を decode
  します

## エクスポート

- `tocPlugin()` — plugin factory
- `TableOfContents` — list component（`components/table-of-contents.tsx` の
  default export）
- `extractTableOfContents(html)` — 見出し抽出
- `initTableOfContents` — browser の scroll-spy 初期化
  （`@riebeckite/plugin-toc/client` 経由でも）
- 型: `TableOfContentsItem`（`{ id, level, title }`）

## 関連

- [Plugin ガイド](../../docs/plugins_jp.md)