---
date: 2026-10-14
title: ビルド状態（Build State）
sidebar:
  hidden: true
---

# ビルド状態（Build State）

ビルドディレクトリに保存される前回のビルドの記録で、エントリ、フィンガープリント、依存関係、出力の変更を保持します。

## 場所と内容

`.riebeckite/build/content-state.json` に保存されます。
エントリ、フィンガープリント、依存関係、パイプラインのフィンガープリント、マニフェストエントリ、出力、外部依存関係、マニフェストフックのキャッシュを保持します。
次のビルドはこれを読み、増分ビルドの変更セットを計算します。

## バージョンと妥当性

バージョンは `CONTENT_BUILD_STATE_VERSION`（現在は24）です。状態が欠落しているか、非互換か、不正な形式の場合はフルビルドの経路に入ります。状態はマニフェストのビルド後、ページ出力の書き込み前にコミットされるため、その後のページレンダリングや出力の失敗で新しい状態が残ることがあります。保存する形を変えるとバージョンが上がるため、古いバージョンで書かれた状態は無視され、ビルドはフルビルドの経路にフォールバックします。

## ビルド状態の構造

`packages/core/src/content/content_build_state.ts` の `ContentBuildState` 型には次が含まれます。
- `version`：number（現在は24）
- `entries`：`Readonly<Record<string, ContentBuildEntry>>` — フィンガープリント、エイリアス、依存関係、リンク先、処理済みコンテンツキャッシュのフィンガープリントを含む、エントリごとの状態
- `contentIndex`：`Readonly<Record<string, string>>` — コンテンツの slug からパスへの対応
- `pipelineFingerprint`：string | undefined — 増分ビルドの妥当性チェック用のパイプラインのフィンガープリント
- `manifestEntries`：`readonly ContentManifestEntry[]` — 前回のビルド時点のマニフェストエントリのスナップショット
- `outputs`：`readonly OutputDescriptor[]` — 前回のビルドの出力記述子
- `externalDependencies`：`readonly PersistedExternalDependency[]` — 外部依存関係のスナップショット
- `manifestHookCache`：`readonly ManifestHookCacheEntry[]` — 実行順に並んだ、マニフェストフックごとの1エントリ。キャッシュ可能なフックは、入力に対して変更したマニフェストエントリだけを、エントリの順序が変わった場合は `order` の一覧もあわせて保存します。エントリ以外のマニフェスト状態も変更するフックはスナップショットを保存せず、毎回実行されます。

`ContentBuildEntry`（`packages/core/src/content/content_build_state.ts`）は次を保持します。
- `fingerprint`：string — ソース、frontmatter、パイプライン、プラグインのキャッシュバージョンを含むコンテンツのフィンガープリント
- `aliases`：`readonly string[]` — frontmatter 由来のエントリのエイリアス
- `dependencies`：`readonly ContentBuildDependency[]` — 安定した識別子を持つコンテンツとファイルの依存関係
- `linkTargets?`：`readonly string[]` — 解決済みのリンク先の slug
- `processedContentCacheFingerprint?`：`string` — 処理済みコンテンツキャッシュの取り決めのフィンガープリント
- `metadataFingerprint?`：`string` — 変更されていない Markdown 以外のコンテンツのフィンガープリントを再利用するためのファイルメタデータのフィンガープリント

`ContentBuildDependency`（`packages/core/src/content/content_build_state.ts`）は次を記録します。
- `kind`：`"content"` または `"file"`
- `id`：string — コンテンツの slug またはファイルのパス

以降のビルドでは、前回の状態を読んで増分ビルドの変更セットを計算します。パイプラインのフィンガープリントを比較し（`previousState.pipelineFingerprint !== pipelineFingerprint`）、パイプラインの構成が変わっていればフルビルドを引き起こします。状態はマニフェストのビルド後、ページ出力の書き込み前にコミットされるため、コミット後のページレンダリングや出力の失敗で新しい状態が残ることがあります。マニフェストのビルド中に失敗した場合は前回の状態が残ります。

## 関連用語

- [[build|Build]]
- [[incremental-build|Incremental Build]]
- [[fingerprint|Fingerprint]]
- [[output-inventory|Output Inventory]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
