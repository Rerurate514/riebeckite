---
date: 2026-10-14
title: 増分ビルド（Incremental Build）
sidebar:
  hidden: true
---

# 増分ビルド（Incremental Build）

コンテンツ依存関係と保存済みのビルド状態を使い、変更された部分だけを再生成するビルドモードです。

## 役割

変更されていないコンテンツと出力の再処理を避けます。
記録済みの依存関係とビルド状態に依存します。

## 仕組み

前回のビルド以降に何が変わったかを確認し、必要な部分だけを処理します。
前回のビルド情報は`.riebeckite/build/content-state.json`に保存されます。
前回の情報がない場合、使えない場合、安全でないと判断された場合は、フルビルドを実行します。

## 状態の安全性

増分ビルドの状態による高速化がなくても、同じサイトを正しく生成できます。
状態が欠落しているか、非互換か、安全でない場合は、フルビルドの経路に入ります。

## フィンガープリントの比較

増分ビルドは、保存済みのビルド状態（`ContentBuildState`）とフィンガープリントを比較して、何が変わったかを判断します。状態ファイル`.riebeckite/build/content-state.json`には、エントリごとのフィンガープリント、パイプラインのフィンガープリント、出力記述子が記録されます。各ビルドで、現在のフィンガープリントが保存済みの値と比較されます。

- **変更なし**：フィンガープリントが保存済みの値と一致 → エントリとその出力を再利用します。
- **変更あり**：フィンガープリントが異なる → エントリを再処理し、依存する出力を無効化します。

保存される状態には次が含まれます。

| フィールド | 説明 |
| --- | --- |
| `version` | ビルド状態のスキーマバージョン（現在は`19`）。 |
| `entries` | `Record<string, ContentBuildEntry>` — エントリごとのフィンガープリントと依存情報。 |
| `pipelineFingerprint` | コンテンツパイプライン（プラグイン、フィルターなど）のハッシュ。 |
| `outputs` | `OutputDescriptor[]` — 最後に生成した出力の一覧。 |
| `contentIndex` | `Record<string, string>` — slugからソースパスへの対応。 |

状態ファイルが欠落しているか、壊れているか、パイプラインのフィンガープリントが異なる場合は、フルビルドを実行します。

---

## 出力一覧の差分

増分ビルドのエンジンは`OutputChangeSet`を生成し、すべての出力を次の4つのカテゴリのいずれかに分類します。

| カテゴリ | 意味 |
| --- | --- |
| `affected` | 依存関係が変わったため再生成が必要な出力。 |
| `unchanged` | 関係する変更がないため再利用できる出力。 |
| `removed` | 前回のビルドには存在したが、現在は生成されない出力。 |
| `fullRegenerationRequired` | 外部依存関係の失敗や`unknown`型の依存関係により、完全な再構築が必要なことを示す真偽値のフラグ。 |

差分は`determineOutputChanges`が次を調べて計算します。

- コンテンツごとのフィンガープリントの変化（`content-state.json`から）。
- タグの変化（エントリへのタグの追加・削除）。
- フォルダーパスの変化（ノートを別のディレクトリへ移した場合など）。
- 外部依存関係のスコープの変化。
- コンテンツエントリの追加・削除。

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

## 関連用語

- [[build|Build]]
- [[build-state|Build State]]
- [[cache-invalidation|Cache Invalidation]]
- [[fingerprint|Fingerprint]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
