---
date: 2026-10-14
title: ビルド（Build）
sidebar:
  hidden: true
---

# ビルド（Build）

Riebeckite がコンテンツを処理し、公開先を解決し、出力を書き出す一連の処理です。

## ビルドの流れ

1. 設定とプラグインを解決する
2. Markdown などのコンテンツを読み込む
3. プラグインによる変換を実行する
4. 公開するページとリンクを決める
5. サイト全体の情報と必要なアセットを集める
6. 画像やブラウザ側のコードなどのアセットを書き出す
7. HonoX でサイトをビルドする

## フルビルドと増分ビルド

`--full` を使うと、前回のビルド情報を使わずにすべてを処理します。
増分ビルドは前回の結果を再利用し、変更された部分だけを処理します。
前回のビルド情報は `.riebeckite/build/content-state.json` に保存されます。

## ビルド状態

ビルド状態はアプリケーション単位で `.riebeckite/build/content-state.json` に保存されます。これは最適化のための情報であり、正となるデータではありません。

状態が欠落しているか、非互換か、安全でない場合は、初期化またはフルビルドの経路に入ります。状態はコンテンツマニフェストの構築後、HonoX/SSG の実行前に保存されます。マニフェストの構築に失敗すれば以前の有効な状態が残りますが、その後の SSG や出力の失敗では新しい状態が残ることがあります。

## パイプラインの段階と出力の生成

ビルドは、コンテンツの読み込みから HTML の出力までを、`packages/core/src/pipeline.ts` で定義された段階に沿って処理します。全体は `packages/core/src/content/content_build_coordinator.ts` の `ContentBuildCoordinator` が調整します。

1. **設定とプラグインの解決**：`resolveConfig` が `site`、`content`、`theme`、`plugins`、`cache` の既定値を検証してマージします。プラグインは `provides` / `requires` / `optional` のケイパビリティに基づいて `resolvePlugins` で順序付けられます。

2. **コンテンツの読み込み**：コンテンツソース（`FileSystemContentSource` など）が、コンテンツディレクトリから Markdown ファイルを読み込みます。

3. **Markdown の解析と変換**：`Pipeline` クラスが unified プロセッサを実行します。`remark` プラグインは parse、frontmatter、GFM、math、独自の remarkPlugins を担当します。`rehype` プラグインは raw、slug、katex、format、stringify、独自の rehypePlugins を担当します。`extendMarkdownPipeline` と `extendHtmlPipeline` フックを使うと、プラグインごとにパイプラインを拡張できます。

4. **frontmatter の抽出と処理**：frontmatter は `matter` / `vfile-matter` で抽出します。処理済みコンテンツは、slug、source、frontmatter、パイプラインのフィンガープリントからなるキーで永続キャッシュに保存されることがあります。依存関係はプラグインの `dependencyMode`（`none` / `tracked` / `global` / `unsafe`）に従って追跡します。

5. **公開判定と公開先の解決**：公開状態は `isPublishable` が決めます。`publishStrategy`（`explicit` / `selective`）と、frontmatter の `publish`、`private`、`draft` を使います。permalink はコンテンツの公開先リゾルバーが解決します。

6. **マニフェストとグラフの構築**：`ContentManager` がマニフェストのエントリを構築し、リンクを解決し、被リンク・発リンクの問い合わせ用にコンテンツグラフ（`ContentGraph`）を組み立てます。タグ、シリーズ、アーカイブのコレクションは `buildContentCollections` が構築します。

7. **出力の生成**：画像やクライアントエントリなどのアセットを収集します。HTML は解決済みのテーマを使って SSG（HonoX）で出力します。前回のビルド状態により、変更されたコンテンツと再利用できる出力を追跡して増分ビルドを行えます。

## パイプラインの実行

`packages/core/src/pipeline.ts` の `Pipeline` クラスは、`execute()` で各コンテンツエントリを処理します。

まず、`packages/core/src/content/content_persistent_cache.ts` の永続コンテンツキャッシュを、slug、source、frontmatter、パイプラインのフィンガープリントからなるキーで確認します。キャッシュにヒットし、無効な依存関係がなければ、キャッシュ済みの frontmatter と HTML がすぐに返されます。

キャッシュミスまたはバイパスの場合は、Remark と Rehype のプラグインによる解析、frontmatter の抽出、GFM、math、独自の変換を経て Markdown を処理します。リンクの解決はコンテンツ依存関係トラッカーを通じて依存関係を記録します。

処理後、結果は依存関係とフィンガープリントとともに永続コンテンツキャッシュへ保存され、以降の増分ビルドで使われます。

パイプラインのフィンガープリント（`computePipelineFingerprint`）は、プラグインの設定、コンテンツフィルター、互換性バージョンを取り込みます。キャッシュ可能かどうかは `isPersistentlyCacheable` が決め、各プラグインの `processedContentCache` の取り決め（`dependencyMode`）を確認します。

## コンテンツキャッシュとの統合

`.riebeckite/cache/content/v5` の永続コンテンツキャッシュは、エントリごとの Markdown 処理結果を保存します。キャッシュキーは、slug、source、正規化された frontmatter、パイプラインのフィンガープリントを含む `CacheKeyInputs` から `computeContentCacheKey` で計算します。

スキーマバージョン（`CONTENT_CACHE_SCHEMA_VERSION`、現在は 5）が一致しないエントリはミスとして扱われ、再処理されます。キャッシュは論理的なコンテンツ、ファイル、リンクの依存関係（`CachedContentDependency`）を記録し、以降のビルドで無効化の判定に使います。

キャッシュデータはワークスペースのパスではなく、論理的な slug と正規化されたソースパスを含みます。そのため、同じオペレーティングシステム上の別のランナーやワークスペースへコピーできます。

## 関連用語

- [[incremental-build|Incremental Build]]
- [[build-state|Build State]]
- [[cache-invalidation|Cache Invalidation]]
- [[fingerprint|Fingerprint]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
