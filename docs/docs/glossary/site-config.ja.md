---
title: Site Config
sidebar:
  hidden: true
---

# Site Config

SiteConfigのフィールド（title、description、author、baseUrl、locale、twitterSite、defaultOgImage、feed）はサイトを記述し、SEOやfeed、localeを駆動します。

## SiteConfigフィールド

| フィールド | 説明 |
| --- | --- |
| `title` | ページの `<title>` とSEOメタデータに使用されるサイトタイトル |
| `description` | ページのデフォルトdescription |
| `author` | ページのデフォルトauthor |
| `baseUrl` | サイトのベースURL（例：`https://example.com`） |
| `locale` | デフォルトlocale（例：`en`, `ja`） |
| `twitterSite` | Cardメタデータ用のTwitter @handle |
| `defaultOgImage` | デフォルトのOpen Graph画像URL |
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

## resolved configでのSite config
Site configフィールドはconfig解決時に`ResolvedRiebeckiteConfig`にマージされ、`packages/core/src/config.ts`で定義されています。解決済みのconfigには`site`が`title`、`description`、`author`、`baseUrl`、`locale`、`twitterSite`、`defaultOgImage`、`feed`を含みます。`feed`サブセクションには`title`、`description`、`language`（`locale`から導出）が含まれます。

これらの解決された値は、BuildとRuntimeを通じてintegrationとプラグインによって使用されます。たとえば、`buildAbsoluteUrl`は`config.site.baseUrl`を使用し、SEOプラグインは`config.site.title`と`config.site.description`をメタデータに使用し、l10nプラグインは`config.site.locale`を言語検出の既定値として使用します。

## 関連用語

- [[glossary/site|Site]]
- [[config|Config]]
- [[feed|Feed]]
- [[glossary/localization|Localization]]

## さらに詳しく

- [../reference/configuration.ja.md]