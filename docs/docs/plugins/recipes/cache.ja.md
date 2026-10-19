---
title: "ビルド結果をキャッシュする"
sidebar:
  label: "12. ビルド結果をキャッシュする"
  order: 12
---
# ビルド結果をキャッシュする

`context.cache` は、プラグイン専用のビルド時キャッシュです。再生成できる JSON 値だけを置き、正となる状態の保存には使いません。

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

アルゴリズムや保存する形を変えたら `cacheVersion` を上げます。キャッシュはプラグイン名とバージョンで名前空間が分かれるため、上げると新しい空間から始まります。壊れたキャッシュはミスとして扱い、再生成してください。

単語数はあくまで例です。サイトで公開する言語に合わせて調整してください。

---

[プラグイン機能別レシピに戻る](./README.ja.md) · [Plugin API](../../reference/plugin-api.ja.md)
