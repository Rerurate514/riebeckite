---
title: "HTTP エンドポイントを追加する"
sidebar:
  label: "9. HTTP エンドポイントを追加する"
  order: 9
---
# HTTP エンドポイントを追加する

`endpoints` は、ルーターをプラグインに埋め込まずに HTTP の振る舞いを宣言します。ホスト側の integration がエンドポイントをルーターへ接続します。scaffold の `app/server.ts` はすでに `mountRiebeckiteEndpoints` を呼んでいます。

```ts
import { defineEndpoint, definePlugin } from "@riebeckite/core";

export function catalogEndpointPlugin() {
  return definePlugin({
    name: "catalog-endpoint",
    endpoints: [
      defineEndpoint(
        "/catalog.json",
        ({ manifest, request }) => {
          const tag = request.query.tag;
          const entries = manifest.discoverableEntries
            .filter((entry) => !tag || entry.tags.includes(tag))
            .map((entry) => ({
              title: entry.title,
              permalink: entry.permalink,
              tags: entry.tags,
            }));

          return { json: entries };
        },
        { cacheControl: "public, max-age=300" },
      ),
    ],
  });
}
```

開発サーバーを起動し、`/catalog.json` または `/catalog.json?tag=typescript` を開きます。

エンドポイントは HTTP 応答であり、静的ファイルではありません。ホストが書き出さない限り、純粋な静的エクスポートに `/catalog.json` は含まれません。ビルド出力にファイルが必要なときは [ファイルの生成](./generated-files.ja.md) を使ってください。

`cacheControl` は、応答をキャッシュしても安全な場合だけ指定します。この応答は manifest に依存するため、通常は短い max age が適切です。

---

[プラグイン機能別レシピに戻る](./README.ja.md) · [Plugin API](../../reference/plugin-api.ja.md)
