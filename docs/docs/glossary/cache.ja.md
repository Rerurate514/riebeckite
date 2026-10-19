---
title: Cache
sidebar:
  hidden: true
---

# Cache

`.riebeckite/`配下に保存する再利用可能なBuildのデータです。Cacheは最適化であり、削除しても公開される出力は変わりません。

## Cacheの保存先

- `.riebeckite/cache`に処理済みコンテンツとPluginごとのcacheが格納されます。
- `.riebeckite/build/content-state.json`は前回Buildの状態です。
- `.riebeckite/ssg-output-cache.json`は描画済みの出力で、`.riebeckite/ssg-output-cache.entries`ディレクトリと`.riebeckite/ssg-output-cache.fast-path.json` sidecarを伴います。
3つともCIをまたいで保存して問題なく、生成されたGitHub Actions workflowが復元します。Riebeckiteは復元したcacheを必ず検証してから使うため、古い・非互換なentryは誤った出力ではなくfull buildにつながります。

## Cacheは正本ではない

cacheのentryが欠落・非互換・不安全な場合は、エラーではなくfull buildの経路に入ります。状態はFull Buildの成功後にのみ書き込むため、失敗したBuildは前回の有効な状態を残します。

## 設定

cacheの挙動は`cache`設定で制御します。

```ts
cache: {
  enabled: true,
}
```

## キャッシュキーの構成

各コンテンツ項目のキャッシュキーは、スラッグ、生のソーステキスト、frontmatter、およびアクティブなconfigとプラグイン版本を捉えるpipeline fingerprintの4つの入力から構成されます。コンテンツメタデータやビルドパイプラインの変更があれば、キャッシュされた結果が無効化されます。

```ts
export function computeContentCacheKey(inputs: CacheKeyInputs): string {
  const { slug, source, frontmatter, pipelineFingerprint } = inputs;
  const normalizedFrontmatter = normalizeFrontmatterForCache(frontmatter);
  const keyData = {
    schemaVersion: CONTENT_CACHE_SCHEMA_VERSION,
    slug,
    source,
    frontmatter: normalizedFrontmatter as JsonValue,
    pipelineFingerprint,
  };
  return hash(stableStringify(keyData as JsonValue));
}
```

キーは`.riebeckite/cache/content/v5/<hash>.json`に保存され、ここで`v5`は現在のスキーマバージョン(`CONTENT_CACHE_SCHEMA_VERSION = 5`)です。古いスキーマバージョンのエントリはミスマッチとして扱われ、再生成されます。

## スキーマと互換性バージョン

- **スキーマバージョン** (`CONTENT_CACHE_SCHEMA_VERSION = 5`)：キャッシュエントリの構造が変更されたとき（フィールドの追加/削除、型の変更）にインクリメントされます。ミスマッチはキャッシュミスとなり、再生成されます。
- **互換性バージョン** (`CONTENT_CACHE_COMPATIBILITY_VERSION = 3`)：パイプラインfingerprintロジックが変更されたとき（プラグインのfingerprint方法など）にインクリメントされます。ミスマッチもまたキャッシュミスとなり、再生成されます。

両バージョンはすべてのキャッシュエントリに組み込まれています。パイプラインfingerprint (`computePipelineFingerprint`)はプラグインfingerprint、content filters、およびオプションのcontent-scope fingerprintを単一のハッシュに結合します。何らかのプラグインの`processedContentCache`取り決めが変更された場合、または`content.filters.publishStrategy`が変更された場合、パイプラインfingerprintが変更され、すべてのキャッシュエントリが実質的に無効化されます。

## 依存関係追跡モードとグローバルキャッシュモード

プラグインは`processedContentCache.dependencyMode`を宣言してキャッシュの安全性を制御できます：

- **`none`**: プラグインの出力は現在のコンテンツソース、frontmatter、プラグインオプションにのみ依存します。外部依存は追跡されません。
- **`tracked`**: 外部コンテンツとファイル入力はframework-owned APIを通じてのみ読み込まれ、依存fingerprintが記録されます。fingerprintが一致しない場合、キャッシュは無効になります。
- **`global`**: キャッシュは解決されたコンテンツ位置セット（すべての公開ページ）に依存します。どのコンテンツ項目のlocationが変化してもキャッシュは無効になります。
- **`unsafe`**: プラグインは`processedContentCache`取り決めなしでprocessed contentに影響を与え得るため、キャッシュはこのプラグインをバイパスしなければなりません。

`hasGlobalContentDependency`ユーティリティは、有効なプラグインのうち`dependencyMode: "global"`を使用しているかどうかをチェックし、インクリメンタルビルド中にfull content-scope fingerprintがトリガーされます。

## 関連用語

- [[plugin-cache|Plugin cache]]
- [[cache-invalidation|Cache Invalidation]]
- [[build-state|Build State]]
- [[incremental-build|Incremental Build]]
- [[fingerprint|Fingerprint]]

```ts
cache: {
  enabled: true,
}
```

## 関連用語

- [[plugin-cache|Plugin cache]]
- [[cache-invalidation|Cache Invalidation]]
- [[build-state|Build State]]
- [[incremental-build|Incremental Build]]

## さらに詳しく

- [Cache](../reference/configuration/cache.ja.md)
