---
date: 2026-10-20
title: "派生データをキャッシュする"
sidebar:
  label: "12. 派生データをキャッシュする"
  order: 12
---
# 派生データをキャッシュする

`context.cache` は、プラグイン専用のビルド時キャッシュです。ビルドをまたいで結果が安定し、計算コストの高い処理に向きます。再生成できる JSON 値だけを置き、正しい状態そのものを保存する用途には使いません。

このレシピは読了時間を計算し、レンダリング後の HTML のハッシュをキーにしてキャッシュします。内容が変わるとキーも変わるため、その内容の計算結果は再利用されません。

```ts
import { definePlugin, type PluginCache } from "@riebeckite/core";

export function readingTimePlugin() {
  return definePlugin({
    name: "reading-time",
    cacheVersion: "1",
    onManifestCreated: async ({ manifest, cache }) => {
      for (const entry of manifest.publicEntries) {
        const minutes = await getReadingMinutes(cache, entry.html);
        entry.headTags = [
          ...(entry.headTags ?? []),
          {
            tag: "meta",
            attrs: {
              name: "reading-time",
              content: String(minutes),
            },
          },
        ];
      }
    },
  });
}

async function getReadingMinutes(
  cache: PluginCache,
  html: string,
): Promise<number> {
  const key = `reading:${hash(html)}`;
  const cached = await cache.get<number>(key);
  if (cached !== undefined) return cached;

  const text = html.replace(/<[^>]+>/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));

  await cache.set(key, minutes);
  return minutes;
}

function hash(value: string): string {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(36);
}
```

アルゴリズムや保存する形を変えたら `cacheVersion` を上げます。キャッシュの名前空間はプラグイン名とバージョンで分かれるため、上げると新しい空間から始まります。壊れたキャッシュはミスとして扱い、再生成してください。

単語数はあくまで例です。サイトで公開する言語に合わせて調整してください。

---

[プラグイン機能別レシピに戻る](./README.ja.md) · [Plugin API](../../reference/plugin-api.ja.md)
