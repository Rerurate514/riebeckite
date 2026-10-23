---
date: 2026-10-14
title: 永続キャッシュ（Persistent Cache）
sidebar:
  hidden: true
---

# 永続キャッシュ（Persistent Cache）

コンテンツごとのキャッシュで、処理済みのMarkdown結果をビルド間で `.riebeckite/cache/content/vN` に保存します。キャッシュに当たればウォームビルドになり、外れれば再処理が必要です。

## キャッシュの内容

`.riebeckite/cache/content/v5` に保存されます。
エントリのキーには、Markdownソース、パース済みfrontmatter、キャッシュスキーマ、処理パイプラインのフィンガープリントが含まれます。
キャッシュされたコンテンツは、ワークスペースのパスではなく論理slugと正規化したソースパスを記録するため、同じオペレーティングシステム上の別のランナーやワークスペースへコピーできます。

## ヒット、ミス、バイパス

ビルドログには `Persistent content cache` の行で `hits`、`misses`、`bypasses` が出ます。
コールドビルド（キャッシュなし）はすべてを最初から処理します。ウォームビルドは互換性のあるエントリを再利用します。
コールドビルドを強制するには `.riebeckite/cache` を削除します。

## キャッシュキーの構造

コンテンツキャッシュのキーは、`CacheKeyInputs` 型で定義された4つの入力から計算したSHA-256ハッシュです。このキーによって、キャッシュ済みエントリをビルド間で再利用できるかが決まります。

| 入力 | 説明 |
| --- | --- |
| `slug` | コンテンツソースのslug（例：`"getting-started"`）。 |
| `source` | 衝突回避に使う生のMarkdownソーステキスト。 |
| `frontmatter` | パース済みfrontmatter。`Date` 値はISO文字列に正規化されます。 |
| `pipelineFingerprint` | プラグイン、コンテンツフィルタ、パイプライン設定のハッシュ。 |

静的関数 `computeContentCacheKey` は `CacheKeyInputs` オブジェクトを受け取り、16進数のダイジェストを返します。

```ts
const key = computeContentCacheKey({
  slug: "getting-started",
  source: markdown,
  frontmatter: { date: new Date() },
  pipelineFingerprint: "...",
});
```

このキーはさらに（スキーマバージョンとともに）ハッシュされ、`.riebeckite/cache/content/v5` 以下にファイルとして保存するための最終的なキャッシュキーになります。

## コンテンツキャッシュのディレクトリ

処理済みのコンテンツエントリは `.riebeckite/cache/content/v5` 以下に保存されます。ディレクトリ構成は次のとおりです。

```
.riebeckite/cache/content/v5/
  └─ <sha256-hex-digest>.json
```

各JSONファイルは `PersistentContentCacheEntry` として `.riebeckite/cache/content/v5/<hash>.json` に書き込まれます。

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

`key` フィールドは、最終的なスキーマバージョンのハッシュを加える前の中間キャッシュキーを保存しており、参照時の診断とキー不一致の検出を可能にします。

## `createPluginCache` と `createUnavailablePluginCache`

プラグインごとの実行時キャッシュは、ビルド実行中（ビルド時）は `createPluginCache` が作成します。書き込み可能なキャッシュがない本番環境やテストモードでは `createUnavailablePluginCache` にフォールバックします。

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

`createPluginCache` は `PluginCache` インスタンスを返し、プラグイン名と `cacheVersion` をキーにした `get`、`set`、`invalidate` 操作に対応します。`createUnavailablePluginCache` は常にミスを報告するスタブを返し、ビルドのたびに再計算を強制します。どちらを使うかは `packages/core/src/pipeline.ts` の `options.isBuildTime`（`cacheFor` メソッド、533〜543行）で決まります。

## 関連用語

- [[glossary/cache|Cache]]
- [[cache-invalidation|Cache Invalidation]]
- [[plugin-cache|Plugin cache]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
