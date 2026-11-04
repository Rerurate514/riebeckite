---
date: 2026-10-14
title: 永続キャッシュ（Persistent Cache）
sidebar:
  hidden: true
---

# 永続キャッシュ（Persistent Cache）

コンテンツごとのキャッシュで、処理済みの Markdown 結果をビルド間で `.riebeckite/cache/content/vN` に保存します。キャッシュに当たればウォームビルドになり、外れれば再処理が必要です。

## キャッシュの内容

`.riebeckite/cache/content/v5` に保存されます。
エントリのキーには、Markdown ソース、パース済み frontmatter、キャッシュスキーマ、処理パイプラインのフィンガープリントが含まれます。
キャッシュされたコンテンツは、ワークスペースのパスではなく論理 slug と正規化したソースパスを記録するため、同じオペレーティングシステム上の別のランナーやワークスペースへコピーできます。

## ヒット、ミス、バイパス

ビルドログには `Persistent content cache` の行で `hits`、`misses`、`bypasses` が出ます。
コールドビルド（キャッシュなし）はすべてを最初から処理します。ウォームビルドは互換性のあるエントリを再利用します。
コールドビルドを強制するには `.riebeckite/cache` を削除します。

## キャッシュキーの構造

コンテンツキャッシュのキーは、`CacheKeyInputs` 型で定義された4つの入力から計算した SHA-256ハッシュです。このキーによって、キャッシュ済みエントリをビルド間で再利用できるかが決まります。

| 入力 | 説明 |
| --- | --- |
| `slug` | コンテンツソースの slug（例：`"getting-started"`）。 |
| `source` | 衝突回避に使う生の Markdown ソーステキスト。 |
| `frontmatter` | パース済み frontmatter。`Date` 値は ISO 文字列に正規化されます。 |
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

このキーがエントリの `key` になります。キャッシュスキーマのバージョンはすでにキーに含まれています。ファイル名は、このキーを別途 SHA-256 でハッシュしたもので、`.riebeckite/cache/content/v5` 以下に保存されます。

## コンテンツキャッシュのディレクトリ

処理済みのコンテンツエントリは `.riebeckite/cache/content/v5` 以下に保存されます。ディレクトリ構成は次のとおりです。

```
.riebeckite/cache/content/v5/
  └─ <sha256-hex-digest>.json
```

各 JSON ファイルは `PersistentContentCacheEntry` として `.riebeckite/cache/content/v5/<hash>.json` に書き込まれます。

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

`key` フィールドは、エントリの計算済みキャッシュキーを保存しており、参照時の診断とキー不一致の検出を可能にします。ファイル名は、このキーを別途ハッシュしたものです。

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

`createPluginCache` は `PluginCache` インスタンスを返し、プラグイン名と `cacheVersion` をキーにした `get`、`set`、`delete`、`clear` 操作に対応します。`createUnavailablePluginCache` は、明示的なビルドコンテキスト外では操作が例外を投げるスタブを返します。どちらを使うかは `packages/core/src/pipeline.ts` の `options.isBuildTime`（`cacheFor` メソッド）で決まります。キャッシュの実装は `packages/core/src/plugin/plugin_cache.ts` にあります。

## 関連用語

- [[glossary/cache|Cache]]
- [[cache-invalidation|Cache Invalidation]]
- [[plugin-cache|Plugin cache]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
