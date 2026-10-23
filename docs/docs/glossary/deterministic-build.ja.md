---
date: 2026-10-14
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

## キャッシュと状態

決定的なビルドでは、persistent content cacheとincremental build stateが一貫していることが重要です。キャッシュヒットが継続する限り同じ出力が生成され、stateのfingerprintが一致しない場合はfull build pathが取られます。

### fingerpringpの再計算

pipeline fingerprintはpluginの設定とcontent filterの設定を含みます。設定が変わると全体のfingerprintが変わるため、キャッシュがbypassされ、再ビルドがtriggerされます。

### 例

```sh
# 設定変更があると cache が bypass されます
riebeckite build

# 設定変更なしで同じ入力の場合、deterministic な出力が生成されます
riebeckite build
```

## 関連用語

- [[fingerprint|Fingerprint]]
- [[build|Build]]
- [[check|Check]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
