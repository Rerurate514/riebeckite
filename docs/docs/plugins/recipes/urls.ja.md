---
date: 2026-10-20
title: "公開 URL を変える"
sidebar:
  label: "4. 公開 URL を変える"
  order: 4
---
# 公開 URL を変える

`resolveContentLocations` は、プラグインが担当するエントリの公開位置を返します。返さなかったエントリは現在の位置を保つため、サイト全体を引き受けることなく一部のセクションだけを変えられます。

このレシピは `notes/` 以下のノートを `/library/` に移し、元の URL から恒久リダイレクトを張ります。

```ts
import {
  definePlugin,
  type ContentPublicLocation,
} from "@riebeckite/core";

export function libraryUrls(prefix = "/library") {
  const base = prefix.replace(/\/+$/, "");

  return definePlugin({
    name: "library-urls",
    resolveContentLocations: ({ entries }) => {
      const locations: ContentPublicLocation[] = [];

      for (const entry of entries) {
        if (!entry.slug.startsWith("notes/")) continue;

        const path = entry.slug.slice("notes/".length);
        locations.push({
          slug: entry.slug,
          permalink: `${base}/${path}`,
          redirects: [
            {
              path: `/${entry.slug}`,
              status: 301,
            },
          ],
        });
      }

      return locations;
    },
  });
}
```

別のプラグインがすでに正規 URL を決めていて、リダイレクトやメタデータだけを足したい場合は `extendContentLocations` を使います。すべてのリゾルバーの後に実行されるため、パーマリンクを作り直す必要はありません。

```ts
import { definePlugin } from "@riebeckite/core";

export function legacyRedirects() {
  return definePlugin({
    name: "legacy-redirects",
    extendContentLocations: ({ entries, locations }) => {
      for (const entry of entries) {
        const location = locations.get(entry.slug);
        if (!location) continue;

        const legacy = `/${entry.slug}`;
        if (legacy === location.permalink) continue;
        if (location.redirects?.some((redirect) => redirect.path === legacy)) {
          continue;
        }

        location.redirects = [
          ...(location.redirects ?? []),
          { path: legacy, status: 301 },
        ];
      }
    },
  });
}
```

複数のプラグインが公開位置を解決できます。実行順はプラグインの順序に従い、同じ slug について後から返された位置が前の位置を上書きします。URL の範囲ごとに担当を分けるか、`order` で優先順位を明示してください。

---

[プラグイン機能別レシピに戻る](./README.ja.md) · [Plugin API](../../reference/plugin-api.ja.md)
