---
title: Build State
sidebar:
  hidden: true
---

# Build State

前回のBuildの記録で、entry、fingerprint、依存関係、出力の変更を含みます。

## 保存される内容

`.riebeckite/build/content-state.json`に保存されます。entry、fingerprint、依存関係、pipelineのfingerprintを含みます。manifestのentry、出力、外部依存、manifest hook cacheを含みます。次のBuildはこれを読み、Incremental Buildの差分を計算します。

## バージョンと妥当性

バージョンは`CONTENT_BUILD_STATE_VERSION`（現在は19）です。欠落、非互換、不正な状態ではFull Buildの経路が選ばれます。状態はBuildが成功したあとにだけ更新されるため、失敗しても以前の有効な状態は壊れません。保存形式を変更するとバージョンが上がるため、古いバージョンで書かれた状態は無視され、Full Buildの経路にフォールバックします。

## Build State構造

`packages/core/src/content/content_build_state.ts`の`ContentBuildState`型には以下が含まれます：
- `version`: number（現在は19）
- `entries`: `Readonly<Record<string, ContentBuildEntry>>`：エントリごとの状態。fingerprint、aliases、dependencies、リンク先、処理済みキャッシュのfingerprintを含みます
- `contentIndex`: `Readonly<Record<string, string>>`：content slugからpathへのマッピング
- `pipelineFingerprint`: string | undefined：インクリメンタルビルドの妥当性チェック用のpipeline fingerprint
- `manifestEntries`: `readonly ContentManifestEntry[]`：前回のBuildからのmanifest entryのスナップショット
- `outputs`: `readonly OutputDescriptor[]`：前回のBuildからのoutput descriptor
- `externalDependencies`: `readonly PersistedExternalDependency[]`：external dependencyスナップショット
- `manifestHookCache`: `readonly ManifestHookCacheEntry[]`：manifest hookごとのentryを実行順に保持します。cacheableなhookは入力に対して変更したmanifest entryだけを保存し、entryの順序が変わった場合は`order`も保存します。entry以外のmanifest状態も変更するhookはスナップショットを保存せず、毎回実行されます。

`ContentBuildEntry`（`packages/core/src/content/content_build_state.ts`）は以下を保持します：
- `fingerprint`: string ：source、frontmatter、pipeline、plugin cache versionを含むcontent fingerprint
- `aliases`: `readonly string[]`：frontmatterからのエントリ別名
- `dependencies`: `readonly ContentBuildDependency[]`：安定したidを持つcontentとfileの依存関係
- `linkTargets?: ``readonly string[]`：解決されたlink target slug
- `processedContentCacheFingerprint?: `string`：処理済みキャッシュの取り決めを表すfingerprint

`ContentBuildDependency`（`packages/core/src/content/content_build_state.ts`）は以下を記録します：
- `kind`: `"content"`または`"file"`
- `id`: string ：content slugまたはfile path

その後のBuildでは、前回の状態が読み込まれてIncremental change setが計算されます。pipeline fingerprintを比較します（`previousState.pipelineFingerprint !== pipelineFingerprint`）。pipeline構成が変更された場合はFull rebuildをトリガーします。状態は成功したBuildのあとにのみ保存されます；失敗したBuildは以前の有効な状態を破壊しません。

## 関連用語

- [[build|Build]]
- [[incremental-build|Incremental Build]]
- [[fingerprint|Fingerprint]]
- [[output-inventory|Output Inventory]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
