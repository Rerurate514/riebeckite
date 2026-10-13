---
title: Deterministic Build
sidebar:
  hidden: true
---

# Deterministic Build

同じ入力に対して同じ出力を生成するBuildです。fingerprint、pipelineのバージョン管理、設定のスナップショットが一貫していることで保証されます。

## 決定性の確保

コンテンツのfingerprint（source、frontmatter、pipeline、PluginのcacheVersion）が一貫します。pipelineのfingerprintにはPluginの設定とcontent filterの設定が含まれます。設定のスナップショットはBuild Stateと外部依存に記録されます。

## フォールバック

決定性を確認できない場合（安全でないPlugin、グローバルな依存など）はFull Buildの経路が選ばれます。cacheやstateのentryが欠落または非互換の場合も同じです。

## 関連用語

- [[fingerprint|Fingerprint]]
- [[build|Build]]
- [[check|Check]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
