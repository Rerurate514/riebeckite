---
title: Persistent Cache
sidebar:
  hidden: true
---

# Persistent Cache

`.riebeckite/cache/content/vN`に保存される、Build間で再利用する処理済みのMarkdownの結果です。cacheに当たればウォームビルドになり、外れれば再処理を強制します。

## cache keyの構造

content cacheのkeyは、`CacheKeyInputs`に定義された4つの入力からSHA-256ハッシュで計算します。このkeyは、cacheしたentryをBuild間で再利用できるかどうかを決めます。

| 入力 | 説明 |
| --- | --- |
| `slug` | コンテンツソースのslug（例：`"getting-started"`）。 |
| `source` | 衝突回避用の生Markdownソーステキスト。 |
| `frontmatter` | 解析済みfrontmatter、`Date`値はISO文字列に正規化されます。 |
| `pipelineFingerprint` | プラグイン、contentフィルタ、pipeline設定のハッシュ。 |

静的関数`computeContentCacheKey`は`CacheKeyInputs`オブジェクトを受け取り16進数のダイジェストを返します：

```ts
const key = computeContentCacheKey({
  slug: "getting-started",
  source: markdown,
  frontmatter: { date: new Date() },
  pipelineFingerprint: "...",
});
```

このkeyはその後スキーマバージョンと結合され、`.riebeckite/cache/content/v5`下でのファイル保存用の最終的なcache keyとなります。

## content cacheのディレクトリ

処理済みのcontent entriesは`.riebeckite/cache/content/v5`下に保存されます。ディレクトリ構成は次のとおりです：

```
.riebeckite/cache/content/v5/
  └─ <sha256-hex-digest>.json
```

各JSONファイルは`PersistentContentCacheEntry`として
`.riebeckite/cache/content/v5/<hash>.json`に書き込まれます：

```json
{
  "schemaVersion": 5,
  "key": "<cache-key>",
  "dependencies": [
    { "kind": "content", "id": "...", "fingerprint": "..." },
    { "kind": "file", "id": "...", "fingerprint": "..." }
  ],
  "value": {
    "frontmatter": { ... },
    "html": "<rendered html>"
  }
}
```

`key`フィールドは最終的なスキーマ版hashの前に計算された中間のcache keyを格納しており、lookup時の診断とkey-mismatch検知を可能にします。

## `createPluginCache`と`createUnavailablePluginCache`

per-plugin runtime cacheは、ビルド実行中（build time）は`createPluginCache`によって作成され、
productionやテストモードで書き込み可能なcacheがなくfall backするときは
`createUnavailablePluginCache`が使用されます。

```ts
// Build time: full per-plugin cache with dependency tracking
const cache = createPluginCache({
  pluginName: "my-plugin",
  cacheVersion: plugin.cacheVersion,
  cacheDirectory: resolvePluginCacheDirectory(config),
  tracer,
  logger,
});

// Runtime / test: no-op cache that always misses
const unavailable = createUnavailablePluginCache();
```

`createPluginCache`は`PluginCache`インスタンスを返し、
plugin名と`cacheVersion`でキー付けされた`get`、`set`、`invalidate`操作をサポートします。
`createUnavailablePluginCache`は常にmissを報告するスタブを返し、
毎のビルドで再計算を強制します。この選択は`packages/core/src/pipeline.ts`の
`options.isBuildTime`（`cacheFor`メソッド、533–543行）で決定されます。

## 関連用語

- [[glossary/cache|Cache]]
- [[cache-invalidation|Cache Invalidation]]
- [[plugin-cache|Plugin cache]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)