---
date: 2026-10-20
title: "独立したページを追加する"
sidebar:
  label: "6. 独立したページを追加する"
  order: 6
---
# 独立したページを追加する

`pageTypes` は HonoX のルートを増やさずにページを追加します。`paths` は静的生成する URL の一覧、`resolve` は一致する pathname のページ本体を返します。担当外のパスでは `null` を返します。

このレシピは、frontmatter の `series` ごとに 1 ページを作ります。ノート側は `series: typescript` と書いて参加します。

```ts
import {
  definePlugin,
  escapeHtml,
  escapeHtmlAttribute,
  type ContentManifestEntry,
} from "@riebeckite/core";

export function seriesPagesPlugin() {
  return definePlugin({
    name: "series-pages",
    pageTypes: [
      {
        id: "series-index",
        paths: ({ manifest }) => {
          const series = new Set<string>();
          for (const entry of manifest.discoverableEntries) {
            const value = getSeries(entry);
            if (value) series.add(value);
          }
          return [...series].sort().map(seriesPath);
        },
        outputDependencies: [{ type: "global" }],
        resolve: ({ manifest, pathname }) => {
          if (!pathname.startsWith("/series/")) return null;

          const series = pathname.slice("/series/".length);
          if (!isSeries(series)) return null;

          const entries = manifest.discoverableEntries
            .filter((entry) => getSeries(entry) === series)
            .sort((left, right) => left.title.localeCompare(right.title));
          if (entries.length === 0) return null;

          const items = entries
            .map(
              (entry) =>
                `<li><a href="${escapeHtmlAttribute(entry.permalink)}">${escapeHtml(entry.title)}</a></li>`,
            )
            .join("");

          return {
            type: "series-index",
            pathname,
            title: `Series: ${series}`,
            body: `<section class="rr-series"><h1>Series: ${escapeHtml(series)}</h1><ul>${items}</ul></section>`,
          };
        },
      },
    ],
  });
}

function getSeries(entry: ContentManifestEntry): string | null {
  const value = entry.frontmatter.series;
  return typeof value === "string" && isSeries(value) ? value : null;
}

function isSeries(value: string): boolean {
  return /^[a-z0-9-]+$/.test(value);
}

function seriesPath(series: string): string {
  return `/series/${series}`;
}
```

`manifest.discoverableEntries` は公開エントリだけを含みます。unlisted もページに含めたい場合は `manifest.publicEntries` を使ってください。`manifest.entries` は下書きも含むため、公開出力には使いません。

ページ本体はサイトの文書フレームに挿入されます。`<html>`、`<head>`、2 つ目の `<body>` は出力しないでください。

---

[プラグイン機能別レシピに戻る](./README.ja.md) · [Plugin API](../../reference/plugin-api.ja.md)
