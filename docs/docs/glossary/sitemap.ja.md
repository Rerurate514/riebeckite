---
date: 2026-10-14
title: サイトマップ（Sitemap）
sidebar:
  hidden: true
---

# サイトマップ（Sitemap）

マニフェストから作られる、検索エンジン向けに検出可能なURLを並べたサイトマップ/robotsです。

## サイトマップの生成

サイトマップはマニフェストの検出可能エントリから生成され、各URLのlastmod、changefreq、priority値が含まれます。検索エンジンがサイトのコンテンツを見つけてインデックスするために使われます。

```ts
import { buildSitemap } from "@riebeckite/plugins/seo";

const sitemap = buildSitemap(manifest.discoverableEntries);
```

## サイトマップ生成の詳細
サイトマップは `packages/plugins/seo/src/site-files.ts` の `renderSitemap` で生成されます。検出可能なエントリごとに `<url>` を持つサイトマップXMLを出力し、次の値を含みます。

- `loc`：各エントリのURL（permalinkとベースURLから構築）
- `lastmod`：各エントリの最終更新日（frontmatterの `updated` または `published` から）
- `changefreq`：ページがどのくらいの頻度で変わりそうか
- `priority`：サイト内の他のURLに対するこのURLの優先度

サイトマップにはサイトのルートURLと、検出可能なすべてのエントリのURLが含まれます（エントリのルート `/` は除く）。検索エンジンがサイトのコンテンツを見つけてインデックスするために使われます。サイトマップは、`Sitemap:` ディレクティブでサイトマップの場所を示すrobots.txtによって補完されます。

```ts
import { renderSitemap } from "@riebeckite/plugin-seo";
// Usage: renderSitemap(config, entries) returns the sitemap XML string
```

## 関連用語

- [[feed|Feed]]
- [[discoverable|Discoverable]]
- [[glossary/permalink|Permalink]]

## さらに詳しく

- [../plugins/seo.ja.md]
