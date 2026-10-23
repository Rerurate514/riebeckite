---
date: 2026-10-14
title: ビルド（Build）
sidebar:
  hidden: true
---

# ビルド（Build）

Riebeckiteがコンテンツを処理し、公開先を解決し、プラグインを実行して、マニフェストとコンテンツグラフを組み立て、出力を書き出す一連の処理です。

## ビルドの流れ

1. 設定とプラグインを解決する
2. Markdownなどのコンテンツを読み込む
3. プラグインによる変換を実行する
4. 公開するページとリンクを決める
5. サイト全体の情報と必要なアセットを集める
6. 画像やブラウザ側のコードなどのアセットを書き出す
7. HonoXでサイトをビルドする

## フルビルドと増分ビルド

`--full`を使うと、前回のビルド情報を使わずにすべてを処理します。
増分ビルドは前回のビルド結果を再利用し、変更された部分だけを処理します。
前回のビルド情報は`.riebeckite/build/content-state.json`に保存されます。

## ビルド状態

ビルド状態はアプリケーション単位で`.riebeckite/build/content-state.json`に保存されます。これは最適化のための情報であり、正となるデータではありません。状態が欠落しているか、非互換か、安全でない場合は、初期化またはフルビルドの経路に入ります。状態はビルドが成功したあとにだけ保存されるため、失敗しても以前の有効な状態は残ります。

## パイプラインの段階と出力の生成

ビルドは、コンテンツの読み込みからHTMLの出力までを、`packages/core/src/pipeline.ts`で定義された一連のパイプライン段階で処理します。全体は`packages/core/src/content/content_build_coordinator.ts`の`ContentBuildCoordinator`が調整します。

1. **設定とプラグインの解決**：`resolveConfig`が`site`、`content`、`theme`、`plugins`、`cache`の既定値を検証してマージします。プラグインは`provides`/`requires`/`optional`のケイパビリティに基づいて`resolvePlugins`で順序付けられます。

2. **コンテンツの読み込み**：コンテンツソース（`FileSystemContentSource`など）がコンテンツディレクトリからMarkdownファイルを読み込みます。

3. **Markdownの解析とプラグインによる変換**：`Pipeline`クラスがunifiedプロセッサを実行します。`remark`プラグインはparse、frontmatter、GFM、math、独自のremarkPluginsを担当し、`rehype`プラグインはraw、slug、katex、format、stringify、独自のrehypePluginsを担当します。プラグインの`extendMarkdownPipeline`と`extendHtmlPipeline`フックを使うと、プラグインごとにパイプラインを拡張できます。

4. **frontmatterの抽出とコンテンツ処理**：frontmatterは`matter`/`vfile-matter`で抽出します。処理済みコンテンツは、slug、source、frontmatter、パイプラインのフィンガープリントからなるキーで永続コンテンツキャッシュに保存されることがあります。依存関係はプラグインの`dependencyMode`（`none`/`tracked`/`global`/`unsafe`）に従って追跡します。

5. **公開判定と公開先の解決**：公開状態は`isPublishable`が決めます。設定された`publishStrategy`（`explicit`/`selective`）とfrontmatterの`publish`、`private`、`draft`を使います。パーマリンクはコンテンツの公開先リゾルバーが解決します。

6. **マニフェストとグラフの構築**：`ContentManager`がマニフェストのエントリを構築し、リンクを解決し、被リンク・発リンクの問い合わせ用にコンテンツグラフ（`ContentGraph`）を組み立てます。タグ、シリーズ、アーカイブのコレクションは`buildContentCollections`が構築します。

7. **出力の生成**：画像やクライアントエントリなどのアセットを収集します。HTMLは解決済みのテーマを使ってSSG（HonoX）で出力します。`.riebeckite/build/content-state.json`の前回のビルド状態により、変更されたコンテンツと再利用できる出力を追跡して増分ビルドを行えます。

## パイプラインの実行

`packages/core/src/pipeline.ts`の`Pipeline`クラスは、`execute()`で各コンテンツエントリを処理します。まず`packages/core/src/content/content_persistent_cache.ts`の永続コンテンツキャッシュを、slug、source、frontmatter、パイプラインのフィンガープリントからなるキャッシュキーで確認します。キャッシュにヒットし、無効な依存関係がなければ、キャッシュ済みのfrontmatterとHTMLがすぐに返されます。キャッシュミスまたはバイパスの場合は、RemarkとRehypeのプラグインによる解析、frontmatterの抽出、GFM、math、独自の変換を経てMarkdownを処理します。リンクの解決はコンテンツ依存関係トラッカーを通じて依存関係を記録します。処理後、結果は依存関係とフィンガープリントとともに永続コンテンツキャッシュへ保存され、以降の増分ビルドで使われます。

パイプラインのフィンガープリント（`computePipelineFingerprint`）は、プラグインの設定、コンテンツフィルター、互換性バージョンを取り込みます。キャッシュ可能かどうかは`isPersistentlyCacheable`が決め、各プラグインの`processedContentCache`の取り決め（dependencyMode: none/tracked/global/unsafe）を確認します。

## コンテンツキャッシュとの統合

`.riebeckite/cache/content/v5`の永続コンテンツキャッシュは、エントリごとのMarkdown処理結果を保存します。キャッシュキーは、slug、source、正規化されたfrontmatter、パイプラインのフィンガープリントを含む`CacheKeyInputs`から`computeContentCacheKey`で計算します。スキーマバージョン（`CONTENT_CACHE_SCHEMA_VERSION`、現在は5）が一致しないエントリはミスとして扱われ、再処理されます。キャッシュは論理的なコンテンツ、ファイル、リンクの依存関係（`CachedContentDependency`）を記録し、以降のビルドで無効化の判定に使います。キャッシュデータはワークスペースのパスではなく論理的なslugと正規化されたソースパスを含むため、同じオペレーティングシステム上の別のランナーやワークスペースへコピーできます。

## 関連用語

- [[incremental-build|Incremental Build]]
- [[build-state|Build State]]
- [[cache-invalidation|Cache Invalidation]]
- [[fingerprint|Fingerprint]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
