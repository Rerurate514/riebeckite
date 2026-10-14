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

## sitemap生成の詳細
sitemapは`packages/plugins/seo/src/site-files.ts`から`renderSitemap`を使用して生成されます。各`<url>`エントリには以下が含まれます：

- `loc`: 各エントリのURL（permalinkとbase URLから構築）
- `lastmod`：各entryの最終更新日（frontmatterの`updated`または`published`から）
- `changefreq`: ページがどのくらいの頻度で変更される可能性があるか
- `priority`: このURLがサイトの他のURLに対する優先度

sitemapにはサイトのルートURLとすべてのdiscoverable entry URLが含まれます（エントリのルート`/`は除く）。検索エンジンがサイトコンテンツを発見・インデックス化するために使用されます。sitemapは`Sitemap:`ディレクティブでsitemapの場所を指すrobots.txtファイルによって補完されます。

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