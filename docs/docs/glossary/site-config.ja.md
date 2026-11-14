---
date: 2026-10-14
title: サイト設定（Site Config）
sidebar.hidden: true
---

# サイト設定（Site Config）

サイトを記述し、SEO、フィード、ロケールを駆動する SiteConfig のフィールド（title、description、author、baseUrl、locale、twitterSite、defaultOgImage、feed）です。

## SiteConfigのフィールド

| フィールド | 説明 |
| --- | --- |
| `title` | ページの `<title>` と SEO メタデータに使うサイトタイトル |
| `description` | ページの既定の説明 |
| `author` | ページの既定の著者 |
| `baseUrl` | サイトのベース URL（例：`https://example.com`） |
| `locale` | 既定のロケール（例：`en`、`ja`） |
| `twitterSite` | カードメタデータ用の Twitter @ハンドル |
| `defaultOgImage` | 既定の Open Graph 画像 URL |
| `feed` | RSS/Atom/JSON Feed の設定 |

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
    feed: {},
  },
});
```

## 解決済み設定でのサイト設定
サイト設定のフィールドは設定の解決時に `ResolvedRiebeckiteConfig` へ解決され、`packages/core/src/config.ts` で定義されています。解決済みの設定には `site` が含まれ、`title`、`description`、`author`、`baseUrl`、`locale`、`twitterSite`、`defaultOgImage`、`feed` を持ちます。`feed` のサブセクションには `title`、`description`、`language`（`locale` から導出）が含まれます。

これらの解決済みの値は、ビルドと実行環境を通じてインテグレーションとプラグインが使います。たとえば `buildAbsoluteUrl` は `config.site.baseUrl` を使い、SEO プラグインはメタデータに `config.site.title` と `config.site.description` を使い、l10n プラグインは言語検出の既定値に `config.site.locale` を使います。

## 関連用語

- [[glossary/site|Site]]
- [[config|Config]]
- [[feed|Feed]]
- [[glossary/localization|Localization]]

## さらに詳しく

- [../reference/configuration.ja.md]
