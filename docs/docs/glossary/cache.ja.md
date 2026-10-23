---
date: 2026-10-14
title: キャッシュ（Cache）
sidebar:
  hidden: true
---

# キャッシュ（Cache）

Riebeckiteが`.riebeckite/`配下に保存する再利用可能なビルドデータで、高コストな処理の繰り返しを避けます。キャッシュは常に最適化であり、削除しても変わるのはビルド速度だけで、公開される出力は変わりません。

## キャッシュの保存先

- `.riebeckite/cache` — 処理済みコンテンツ。プラグインごとのキャッシュも含みます。
- `.riebeckite/build/content-state.json` — 前回のビルド状態。
- `.riebeckite/ssg-output-cache.json` — 描画済みの出力。`.riebeckite/ssg-output-cache.entries`ディレクトリと`.riebeckite/ssg-output-cache.fast-path.json`のサイドカーを伴います。
3つともCIの実行をまたいで保存しても安全で、生成されたGitHub Actionsワークフローが復元します。Riebeckiteは復元したキャッシュを必ず検証してから使うため、古い・非互換なエントリは誤った出力ではなくフルビルドにつながります。

## キャッシュは正となるデータではない

キャッシュのエントリが欠落しているか、非互換か、安全でない場合は、エラーではなくフルビルドの経路に入ります。状態はビルドが成功したあとにだけ書き込まれるため、失敗したビルドは以前の有効な状態を残します。

## 設定

キャッシュの挙動は`cache`設定で制御します。

```ts
cache: {
  enabled: true,
}
```

## キャッシュキーの構成

各コンテンツ項目のキャッシュキーは4つの入力から構成されます。slug、生のソーステキスト、frontmatter、そして有効な設定とプラグインのバージョンを捉えるパイプラインのフィンガープリントです。これにより、コンテンツ、そのメタデータ、ビルドパイプラインのいずれかが変われば、キャッシュされた結果が無効化されます。

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

キーは`.riebeckite/cache/content/v5/<hash>.json`に保存されます。`v5`は現在のスキーマバージョン（`CONTENT_CACHE_SCHEMA_VERSION = 5`）です。古いスキーマバージョンのエントリは不一致として扱われ、再生成されます。

## スキーマバージョンと互換性バージョン

- **スキーマバージョン**（`CONTENT_CACHE_SCHEMA_VERSION = 5`）：キャッシュエントリの構造が変わったとき（フィールドの追加・削除、型の変更）に上がります。不一致はキャッシュミスとなり、再生成されます。
- **互換性バージョン**（`CONTENT_CACHE_COMPATIBILITY_VERSION = 3`）：パイプラインのフィンガープリントのロジックが変わったとき（プラグインのフィンガープリントの取り方など）に上がります。不一致もキャッシュミスとなります。

どちらのバージョンもすべてのキャッシュエントリに埋め込まれます。パイプラインのフィンガープリント（`computePipelineFingerprint`）は、プラグインのフィンガープリント、コンテンツフィルター、任意のコンテンツスコープのフィンガープリントを1つのハッシュにまとめます。いずれかのプラグインの`processedContentCache`の取り決めが変わった場合、または`content.filters.publishStrategy`が変わった場合、パイプラインのフィンガープリントが変わり、すべてのキャッシュエントリが実質的に無効化されます。

## 依存関係を追跡するモードとグローバルモード

プラグインは`processedContentCache.dependencyMode`を宣言して、キャッシュの安全性をどう判定するかを制御できます。

- **`none`**：プラグインの出力は、現在のコンテンツソース、frontmatter、プラグインのオプションにだけ依存します。外部依存関係は追跡しません。
- **`tracked`**：外部のコンテンツとファイルの入力は、依存関係のフィンガープリントを記録するフレームワーク所有のAPIを通じてのみ読み込みます。それらのフィンガープリントが一致する場合にだけキャッシュは有効です。
- **`global`**：キャッシュは解決済みのコンテンツ位置の集合（公開されるすべてのページ）に依存します。どのコンテンツ項目の位置が変わってもキャッシュは無効になります。
- **`unsafe`**：プラグインは`processedContentCache`の取り決めなしに処理済みコンテンツへ影響し得るため、キャッシュはこのプラグインをバイパスしなければなりません。

`hasGlobalContentDependency`ユーティリティは、有効なプラグインに`dependencyMode: "global"`のものがあるかを確認します。ある場合は増分ビルド中にコンテンツスコープ全体のフィンガープリントを計算します。

## 関連用語

- [[plugin-cache|Plugin cache]]
- [[cache-invalidation|Cache Invalidation]]
- [[build-state|Build State]]
- [[incremental-build|Incremental Build]]
- [[fingerprint|Fingerprint]]

## さらに詳しく

- [Cache](../reference/configuration/cache.ja.md)
