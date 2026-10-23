---
date: 2026-10-14
title: サイト設定（Site Config）
sidebar:
  hidden: true
---

# サイト設定（Site Config）

サイトを記述し、SEO、フィード、ロケールを駆動するSiteConfigのフィールド（title、description、author、baseUrl、locale、twitterSite、defaultOgImage、feed）です。

## SiteConfigのフィールド

| フィールド | 説明 |
| --- | --- |
| `title` | ページの `<title>` とSEOメタデータに使うサイトタイトル |
| `description` | ページの既定の説明 |
| `author` | ページの既定の著者 |
| `baseUrl` | サイトのベースURL（例：`https://example.com`） |
| `locale` | 既定のロケール（例：`en`、`ja`） |
| `twitterSite` | カードメタデータ用のTwitter @ハンドル |
| `defaultOgImage` | 既定のOpen Graph画像URL |
| `feed` | RSS/Atom/JSON Feedの設定 |

```ts
import { defineConfig } from "@riebeckite/core";

export default defineConfig({
  site: {
    title: "My Site",
    description: "A description",
    author: "Author Name",
    baseUrl: "https://example.com",
    locale: "en",
    twitterSite: "@example",
    defaultOgImage: "/og-image.png",
    feed: {
      type: "rss",
    },
  },
});
```

## 解決済み設定でのサイト設定
サイト設定のフィールドは設定の解決時に `ResolvedRiebeckiteConfig` へ解決され、`packages/core/src/config.ts` で定義されています。解決済みの設定には `site` が含まれ、`title`、`description`、`author`、`baseUrl`、`locale`、`twitterSite`、`defaultOgImage`、`feed` を持ちます。`feed` のサブセクションには `title`、`description`、`language`（`locale` から導出）が含まれます。

これらの解決済みの値は、ビルドと実行環境を通じてインテグレーションとプラグインが使います。たとえば `buildAbsoluteUrl` は `config.site.baseUrl` を使い、SEOプラグインはメタデータに `config.site.title` と `config.site.description` を使い、l10nプラグインは言語検出の既定値に `config.site.locale` を使います。

## 関連用語

- [[glossary/site|Site]]
- [[config|Config]]
- [[feed|Feed]]
- [[glossary/localization|Localization]]

## さらに詳しく

- [../reference/configuration.ja.md]
