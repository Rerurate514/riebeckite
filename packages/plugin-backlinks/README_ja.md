# @riebeckite/plugin-backlinks

記事の backlink list 描画: 現在の note にリンクしている published note を表示します。

[English](./README_en.md)

## 概要

`backlinks()` は incoming links の footer list を描画する `Backlinks`
component を提供します。`getPublishedBacklinks()` は content manifest から
note の incoming links を解決し、`frontmatter` が `isPublished` を通過する
note だけを保持して manifest 順で返します。

incoming links が無い場合（または published なものが無い場合）は、component
は何も描画しません。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { backlinksPlugin } from "@riebeckite/plugin-backlinks";

export default defineConfig({
  // ...
  plugins: [backlinksPlugin()],
});
```

`backlinksPlugin()` は plugin list に plugin を登録し、`style.css` を app の
stylesheet に bundle します。

### Component の描画

```tsx
import Backlinks, { getPublishedBacklinks } from "@riebeckite/plugin-backlinks";
import { config } from "../config";
import { content } from "../content";
import { getArticleTitle } from "../lib/article-title";

const manifest = await content.getManifest();
const backlinks = getPublishedBacklinks({
  manifest,
  config,
  slug,
  resolveTitle: getArticleTitle,
});

// route 内で
return (
  <Article
    footerContent={<Backlinks backlinks={backlinks} />}
  />
);
```

## Component

`Backlinks({ backlinks })` は eyebrow label と各 backlink の slug への link list
を持つ `<footer class="article-backlinks">` を描画します。

## エクスポート

- `backlinksPlugin()` — plugin factory
- `Backlinks` — list component（`components/backlinks.tsx` の default export）
- `getPublishedBacklinks({ manifest, config, slug, resolveTitle })` — slug の
  published backlinks を解決
- 型: `ArticleBacklink`（`{ slug, title }`）

## 関連

- [Plugin ガイド](../../docs/plugins_jp.md)
- [`@riebeckite/plugin-local-graph`](../plugin-local-graph/README_ja.md)
- [`@riebeckite/plugin-garden-explorer`](../plugin-garden-explorer/README_ja.md)