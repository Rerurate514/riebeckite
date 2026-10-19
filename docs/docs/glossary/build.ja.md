---
title: Build
sidebar:
  hidden: true
---

# Build

Riebeckiteがコンテンツを処理し、公開位置を解決して、manifestとcontent graphを組み立て、出力を書き出す一連の処理です。

## Buildの流れ

1. 設定とPluginを解決します。
2. Markdownなどのコンテンツを読み込みます。
3. Pluginによる変換を実行します。
4. 公開するページとリンクを決めます。
5. サイト全体の情報と必要なassetを集めます。
6. 画像やブラウザ側のコードなどのassetを書き出します。
7. HonoXでサイトをBuildします。

## Full BuildとIncremental Build

`--full`を使うと、以前のBuild情報を使わずにすべてを処理します。Incremental Buildは前回の結果を再利用し、変わった部分だけを処理します。前回のBuild情報は`.riebeckite/build/content-state.json`に保存されています。

## Build State

Build Stateは`.riebeckite/build/content-state.json`に保存され、アプリケーション単位で共有されます。これは最適化のための情報で、元データではありません。欠落、非互換、安全でない状態ではinitialまたはfullの経路が選ばれます。状態はBuildが成功したあとにだけ保存されるため、失敗しても以前の有効な状態は保たれます。

## Buildの段階と出力の生成

Buildプロセスは、`packages/core/src/pipeline.ts`で定義されたパイプラインの段階を順に進み、コンテンツの読み込みからHTMLの出力までを処理します。全体は`ContentBuildCoordinator`が調整します。

1. **設定とPluginの解決**：`resolveConfig`が`site`、`content`、`theme`の既定値を検証してマージします。`provides`/`requires`/`optional`のCapabilityに基づいてPluginを順序付けます。

2. **コンテンツの読み込み**：`FileSystemContentSource`などのContent Sourceが、コンテンツディレクトリからMarkdownファイルを読み込みます。

3. **Markdownの解析とPluginによる変換**：`Pipeline`クラスがunifiedプロセッサを実行します。`remark`プラグインはparse、frontmatter、GFM、math、custom remarkPluginsです。`rehype`プラグインはraw、slug、katex、format、stringify、custom rehypePluginsです。`extendMarkdownPipeline`と`extendHtmlPipeline`のhookで、Pluginごとにパイプラインを拡張できます。

4. **frontmatterの抽出とコンテンツ処理**：frontmatterは`matter`や`vfile-matter`で抽出します。変換したコンテンツは、slug、source、frontmatter、パイプラインのfingerprintからなるキーでpersistent cacheに保存されることがあります。依存関係はPluginの`dependencyMode`（`none`/ `tracked`/ `global`/ `unsafe`）に従って追跡します。

5. **公開判定と公開位置の解決**：`isPublishable`が公開状態を決めます。`publishStrategy`（`explicit`/ `selective`）とfrontmatterのfieldを使います。fieldは`publish`、`private`、`draft`です。permalinkはコンテンツの公開位置の解決で決まります。

6. **manifestとgraphの構築**：`ContentManager`がmanifestのentryを構築し、リンクを解決します。さらに、`ContentGraph`にincoming / outgoingのリンク問い合わせを構築します。tag、series、archiveのcollectionは`buildContentCollections`が作ります。

7. **出力の生成**：画像やClient Entryなどのassetを収集します。解決したThemeを使ってSSG（HonoX）でHTMLを出力します。`.riebeckite/build/content-state.json`の前回のBuild状態を使い、変更したコンテンツと再利用できる出力を追跡してIncremental Buildを行います。

## パイプライン実行

`packages/core/src/pipeline.ts`の`Pipeline`クラスは`execute()`で各コンテンツエントリを処理します。まず`packages/core/src/content/content_persistent_cache.ts`の永続的content cacheをチェックします。キャッシュキーはslug、source、frontmatter、pipeline fingerprintです。cacheヒットで無効な依存がない場合は、キャッシュされたfrontmatterとHTMLが即座に返されます。cacheミスまたはバイパスの場合、RemarkとRehypeプラグインによる解析、frontmatter抽出、GFM、math、カスタム変換を経てmarkdownが処理されます。リンク解決はコンテンツ依存関係トラッカーを通じて依存を記録します。処理後、結果は将来のIncremental Build用にdependenciesとfingerprintとともにpersistent content cacheに保存されます。

pipeline fingerprint（`computePipelineFingerprint`）は、plugin構成とcontent filterを組み込みます。compatibility versionも対象です。cache可能性は`isPersistentlyCacheable`によって決まります。各pluginの`processedContentCache`の取り決め（dependencyMode: none/tracked/global/unsafe）がチェックされます。

## 永続的content cache統合

`.riebeckite/cache/content/v5`にエントリごとのMarkdown処理結果が保存されます。cacheキーは`computeContentCacheKey`で計算されます。入力の`CacheKeyInputs`にはslug、source、正規化されたfrontmatter、pipeline fingerprintが含まれます。`CONTENT_CACHE_SCHEMA_VERSION`（現在は5）と一致しないentryはmissとして扱われ、最初から再処理されます。cacheは後続のBuildで依存の無効化を判定するために、論理的なcontent、file、linkの依存関係（`CachedContentDependency`）を記録します。cacheデータはワークスペースパスではなく論理的slugと正規化されたsourceパスを含むため、同じOS上の異なるランナーやワークスペースにコピーできます。

## 関連用語

- [[incremental-build|Incremental Build]]
- [[build-state|Build State]]
- [[cache-invalidation|Cache Invalidation]]
- [[fingerprint|Fingerprint]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
