---
date: 2026-10-20
title: "コンテンツグラフにリンクを追加する"
sidebar:
  label: "5. コンテンツグラフにリンクを追加する"
  order: 5
---
# コンテンツグラフにリンクを追加する

`extendContentGraph` は、エントリとリンクが集まった後、グラフとバックリンクが構築される前に実行されます。Markdown の記法では表せない関係を `entry.links` に追加できます。

このレシピは frontmatter の `related` を読み、ノートへのリンクを追加します。追加したリンクはグラフとバックリンク一覧に反映されます。

```ts
import { definePlugin } from "@riebeckite/core";

export function relatedLinks() {
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

プラグインがエントリを頻繁に照会する場合は、`@riebeckite/core` の `queryContentEntries` を使います。`@riebeckite/plugin-query` の出力を利用する場合は、`requires: ["content.query"]` を宣言して提供側の後に実行されるようにします。グラフフックは関係を表すためのもので、照会層の代わりではありません。

---

[プラグイン機能別レシピに戻る](./README.ja.md) · [Plugin API](../../reference/plugin-api.ja.md)
