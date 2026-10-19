---
title: Incremental Build
sidebar:
  hidden: true
---

# Incremental Build

content dependencyと保存したBuild Stateを使って、変わった分だけを再生成するBuildです。宣言した入力が変わっていなければ、未変更のコンテンツと出力を再利用します。

## 仕組み

前回のBuild Stateとfingerprintを比べ、変わったentryを特定します。依存関係を通じて無効化を伝播させ、影響する出力だけを描画し直します。

## fingerprint比較

incremental buildは`ContentBuildState`に保存されたbuild stateのfingerprintと比較して、何が変わったかを特定します。状態ファイルは`.riebeckite/build/content-state.json`にあり、per-entryのfingerprint、pipeline fingerprint、output descriptorが記録されています。各ビルドで現在のfingerprintは保存された値と比較されます：

- **unchanged** (変更なし): fingerprintが保存値と一致→ entryとそのoutputは再利用されます。
- **changed** (変更あり): fingerprintが保存値と異なる→ entryは再処理され、dependentなoutputは無効化されます。

保存されている状態は以下のフィールドを持ちます：

| フィールド | 説明 |
| --- | --- |
| `version` | build stateスキーマバージョン（現在は `19`）。 |
| `entries` | `Record<string, ContentBuildEntry>` ： per-entryのfingerprintと依存情報。 |
| `pipelineFingerprint` | content pipelineのハッシュ（プラグイン、フィルタなど）。 |
| `outputs` | `OutputDescriptor[]` ： 最後に生成されたoutput inventory。 |
| `contentIndex` | `Record<string, string>` ： slugからソースパスへのマッピング。 |

stateファイルが欠落している、破損している、あるいはpipeline fingerprintが異なっている場合、full buildが実行されます。

## output inventoryの差分

incremental engineは`OutputChangeSet`を発生させ、以下の4つのカテゴリに出力を分類します：

| カテゴリ | 意味 |
| --- | --- |
| `affected` | 依存が変わったため再生成が必要なoutput。 |
| `unchanged` | 特に変更がないため再利用できるoutput。 |
| `removed` | 前回のbuildで存在したが、現在は生成されていないoutput。 |
| `fullRegenerationRequired` | external dependencyのfailureや`unknown`型の依存により完全再構築が必要なフラグ。 |

diffは以下を調べて計算されます：

- contentごとのfingerprint変化（`content-state.json`から）。
- tagの変更（entryへのタグの追加/削除）。
- folder pathの変更（noteが別のディレクトリに移動したなど）。
- 外部依存の範囲の変化。
- 内容の追加または削除。

出力変更セットの例：

```json
{
  "affected": [...],
  "unchanged": [...],
  "removed": [...],
  "fullRegenerationRequired": false,
  "candidateOutputCount": 120,
  "affectedOutputCount": 15,
  "removedOutputCount": 3,
  "unchangedOutputCount": 102
}
```

- [[build|Build]]
- [[build-state|Build State]]
- [[cache-invalidation|Cache Invalidation]]
- [[fingerprint|Fingerprint]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
