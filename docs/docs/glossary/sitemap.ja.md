---
title: Sitemap
sidebar:
  hidden: true
---

# Sitemap

manifestからビルドされた検索エンジン向けのsitemap/robotsリストで、discoverableなURLを提供します。

## sitemap生成

sitemapはmanifestのdiscoverable entryから生成され、各URLにlastmod、changefreq、priority値が含まれます。検索エンジンがサイトコンテンツを発見・インデックス化するために使用されます。

```ts
import { buildSitemap } from "@riebeckite/plugins/seo";

const sitemap = buildSitemap(manifest.discoverableEntries);
```

## 関連用語

- [[feed|Feed]]
- [[discoverable|Discoverable]]
- [[glossary/permalink|Permalink]]

## さらに詳しく

- [../plugins/seo.ja.md]