---
date: 2026-10-14
title: サイトマップ（Sitemap）
sidebar:
  hidden: true
---

# サイトマップ（Sitemap）

マニフェストから作られる、検索エンジン向けに検出可能な URL を並べたサイトマップ/robots です。

## サイトマップの生成

サイトマップはマニフェストの検出可能エントリから生成され、`noindex: true` のエントリは除外されます。各 URL には任意で lastmod 値が含まれます。検索エンジンがサイトのコンテンツを見つけてインデックスするために使われます。

```ts
import { renderSitemap } from "@riebeckite/plugin-seo";

const sitemap = renderSitemap(config, manifest.discoverableEntries);
```

## サイトマップ生成の詳細
サイトマップは `packages/plugins/seo/src/site-files.ts` の `renderSitemap` で生成されます。検出可能なエントリごとに `<url>` を持つサイトマップ XML を出力し、次の値を含みます。

- `loc`：各エントリの URL（permalink とベース URL から構築）
- `lastmod`：各エントリの最終更新日（frontmatter の `updated` または `published` から。値がある場合のみ）

サイトマップにはサイトのルート URL と、検出可能なすべてのエントリの URL が含まれます（エントリのルート `/` は除く）。検索エンジンがサイトのコンテンツを見つけてインデックスするために使われます。サイトマップは、`Sitemap:` ディレクティブでサイトマップの場所を示す robots.txt によって補完されます。

```ts
import { renderSitemap } from "@riebeckite/plugin-seo";
const sitemap = renderSitemap(config, entries);
```

## 関連用語

- [[feed|Feed]]
- [[discoverable|Discoverable]]
- [[glossary/permalink|Permalink]]

## さらに詳しく

- [../plugins/seo.ja.md]
