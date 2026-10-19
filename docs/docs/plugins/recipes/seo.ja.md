---
title: "SEO をカスタマイズする"
sidebar:
  label: "10. SEO をカスタマイズする"
  order: 10
---
# SEO をカスタマイズする

`seo` を使うと、メタデータ、サイトマップ、robots、フィードの生成をプラグインから提供できます。解決順で最初に `seo` を宣言したプラグインが使われるため、カスタムプラグインで公式のヘルパーを包み、一部のメソッドだけを上書きできます。

`sitemap.xml`、フィード、`robots.txt` のエンドポイントも必要な場合は、`@riebeckite/plugin-seo` を登録したままにしてください。

```ts
import { definePlugin } from "@riebeckite/core";
import {
  buildAbsoluteUrl,
  buildArticleSeo,
  buildPostUrl,
  buildWebsiteSeo,
  getDescription,
  getEntryPublishedTime,
  getEntryUpdatedTime,
  getHtmlLanguage,
  renderAtomFeed,
  renderJsonFeed,
  renderRobots,
  renderRssFeed,
  renderSitemap,
} from "@riebeckite/plugin-seo";

export function titleSuffixPlugin(suffix = " | Example") {
  return definePlugin({
    name: "seo-title-suffix",
    order: -10,
    seo: {
      buildArticleSeo(config, permalink, post, headTags, language) {
        const metadata = buildArticleSeo(
          config,
          permalink,
          post,
          headTags,
          language,
        );
        return { ...metadata, title: `${metadata.title}${suffix}` };
      },
      buildWebsiteSeo,
      buildAbsoluteUrl,
      buildPostUrl,
      getDescription,
      getEntryPublishedTime,
      getEntryUpdatedTime,
      getHtmlLanguage,
      renderSitemap,
      renderRobots,
      renderRssFeed,
      renderAtomFeed,
      renderJsonFeed,
    },
  });
}
```

`order: -10` により、このプラグインは公式の `seo` より前に並びます。ケイパビリティの依存関係がある場合は、`order` に関係なく提供側が利用側より前に置かれます。

JSON-LD にも同じタイトルが出る場合は、返すメタデータの `jsonLd` も更新してください。ページタイトルと構造化データが食い違うのを防ぎます。

---

[プラグイン機能別レシピに戻る](./README.ja.md) · [Plugin API](../../reference/plugin-api.ja.md)
