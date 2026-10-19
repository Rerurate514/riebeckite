---
title: Plugin cache
sidebar:
  hidden: true
---

# Plugin cache

各Pluginは`context.cache`を通じてビルド時だけ使えるPlugin固有のcacheを持ちます。保存できるのはJSONに変換できる値だけで、名前空間はPluginごとに分かれます。

## 目的とスコープ

Plugin cacheはPluginごとに隔離され、ビルド中だけ有効です。永続データベースやCloudflare Workersのストレージではありません。

```ts
context.cache.set("key", value)
const value = await context.cache.get("key")
```

## Cacheの無効化

壊れたcacheは安全に無視され、再生成されます。書き込みは途中の状態を残しません。interrupt compatibilityが変わったときは`cacheVersion`で切り替えます。

```mermaid
flowchart TD
  Work["Plugin work"]
  Cache{"Valid cache?"}
  Work --> Cache
  Cache -->|Yes| Reuse["Reuse"]
  Cache -->|No| Regenerate["Regenerate"]
```

## 設定

cacheの動作はPlugin定義の`cacheVersion`で制御します。処理済みコンテンツのcacheは、依存モード`none`/ `tracked`/ `global`/ `unsafe`で制御します。

## processedContentCacheモード

plugin定義の`processedContentCache`の取り決めには`dependencyMode`があります。これはpersistent content cacheが依存関係をどのように追跡するかを決めます。モードは4つです：

| モード | 説明 |
| --- | --- |
| `none` | 処理されたHTMLは現在のコンテンツソース、frontmatter、pluginオプションにのみ依存します。dependency fingerprintは記録されず、毎のビルドでコンテンツが変更されたかのように扱われます。 |
| `tracked` | 外部のコンテンツとファイル入力は、fingerprintを記録するframework所有のAPIを通じてのみ読み取られます（`CachedContentDependency`経由）。キャッシュは出力に何が影響したかを証明でき、精密な無効化を可能にします。 |
| `global` | 処理されたHTMLは解決されたコンテンツ位置セット（すべてのentryのpermalinkと言語）に依存します。dependency fingerprintはper-entryではなく、全contentセットに対して記録されます。 |
| `unsafe` | pluginが何が影響できるか証明できない場合、persistent content cacheはこのpluginを完全にバイパスする必要があります。`dependencyMode: "unsafe"` をany pluginが持っていて `appliesToContent` を持たない場合、`requiresFullContentRegeneration` は `true` を返します。 |

`tracked`モードでプラグイン定義の例：

```ts
export default definePlugin({
  name: "my-plugin",
  cacheVersion: "1",
  processedContentCache: {
    version: "1",
    dependencyMode: "tracked",
    appliesToContent: (context) =>
      context.slug.startsWith("blog/") ? "applies" : "does-not-apply",
    contentDependencyFingerprint: (context) => {
      // このpluginが依存するcontent inputsのハッシュを返します。
      return computeMyFingerprint(context.slug);
    },
    environmentFingerprint: () => {
      // ランタイム環境のハッシュ（例: node version, OS）。
      return `env:${process.version}`;
    },
  },
});
```

---

## trackedモードでの依存関係の記録

`tracked`モードでは、Pluginがコンテンツを処理するときにCoreのAPIを呼び出して依存関係を記録します。パイプライン（`content_dependency_tracker.ts`）は`CachedContentDependency`のentryを入力のハッシュとして記録します。entryには`kind`（`"content"`または`"file"`）と`fingerprint`が付きます。これらの依存関係はpersistent content cacheのentryに保存されます。entryの型は`content_persistent_cache.ts`の`PersistentContentCacheEntry`です。後続のBuildでは、依存のfingerprintが変わるとcache entryが無効化され、コンテンツが再処理されます。

trackingは、Markdownリンクの正規化とContent Sourceの読み取り中に渡される`recordLinkResolution`コールバックを通じてパイプラインが行います。`remarkPlugins`、`rehypePlugins`、`onContentLoaded`、`onPostParsed`、`onPostProcessed`を使うPluginは追跡対象です。対象モードはtrackedです。

---

## `cacheVersion`と`processedContentCache.version`の違い

2つのversionフィールドを区別することが重要です。

- **`cacheVersion`**（Plugin定義のfield、型`string`）：Pluginごとの一時的なruntime cacheをバージョン管理します。`createPluginCache`/ `createUnavailablePluginCache`（`packages/core/src/pipeline.ts`）が管理します。このバージョンを変えるとPluginのローカルcacheが無効化されます。
- **`processedContentCache.version`**（取り決めのfield、型`string`）は、キャッシュの取り決めをバージョン管理します。対象はpersistent processed-content cacheです。この値を変えると、この取り決めを使うPluginが影響するすべてのcontent cache entryが無効化されます。

`createPluginCache`と`createUnavailablePluginCache`の選択が、Pluginごとのcacheを使えるかどうかを決めます。選択は`packages/core/src/pipeline.ts`の`options.isBuildTime`と`cacheFor`メソッド（533〜543行）で行われます。

## 関連用語

- [[plugin|Plugin]]
- [[plugin-dependency|Plugin dependency]]
- [[lifecycle-hook|Lifecycle hook]]
- [[glossary/diagnostics|Diagnostics]]
- [[cache-invalidation|Cache Invalidation]]
- [[cache-version|Cache Version]]

## さらに詳しく

- [Build System](../framework/build-system.md)
- [Build Dependency Contract](../framework/build-dependency.md)