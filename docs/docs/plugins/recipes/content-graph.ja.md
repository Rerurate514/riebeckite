---
title: "コンテンツグラフにリンクを追加する"
sidebar:
  label: "5. コンテンツグラフにリンクを追加する"
  order: 5
---
# コンテンツグラフにリンクを追加する

`extendContentGraph` は、エントリとリンクが集まった後、グラフと backlink が構築される前に実行されます。Markdown の記法では表せない関係を `entry.links` に追加できます。

このレシピは frontmatter の `related` を読み、ノートへのリンクを追加します。追加したリンクはグラフと backlink 一覧に反映されます。

```ts
import { definePlugin } from "@riebeckite/core";

export function relatedLinksPlugin() {
  return definePlugin({
    name: "related-links",
    extendContentGraph: ({ entries, contentIndex }) => {
      for (const entry of entries) {
        const related = entry.frontmatter.related;
        if (!Array.isArray(related)) continue;

        for (const raw of related) {
          if (typeof raw !== "string" || raw.trim() === "") continue;

          const key = raw.trim().toLowerCase().replace(/\.md$/, "");
          const slug = contentIndex.get(key);
          if (!slug || slug === entry.slug) continue;
          if (entry.links.some((link) => link.slug === slug)) continue;

          entry.links.push({
            raw,
            slug,
            kind: "note",
            embed: false,
          });
        }
      }
    },
  });
}
```

`contentIndex` のキーは、小文字化されたパスの末尾とエイリアスです。人が書いた名前は、自分で slug を組み立てずにインデックスで解決してください。

エントリを頻繁に検索するプラグインには `content.query` ケイパビリティを使います。グラフフックは関係の追加用であり、クエリ層の代わりではありません。

---

[プラグイン機能別レシピに戻る](./README.ja.md) · [Plugin API](../../reference/plugin-api.ja.md)
