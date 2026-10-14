---
title: Unused Asset
sidebar:
  hidden: true
---

# Unused Asset

どのコンテンツからも参照されていないassetです。診断は既定でオフになっており、有効にすると未使用のassetを報告します。

## 検出

`diagnostics`の設定で未使用のassetの報告を有効にします。削除候補のassetを、Buildを止めずに知らせます。

## Asset Tracking

assetは、コンテンツの`assets`フィールドとcontent内のリンク参照で追跡されます。Diagnostics PluginはBuild中にassetの参照を監視し、参照されていないassetを報告します。コンテンツのfrontmatterの`assets`フィールドやリンク参照（`![alt]`やWikiLink構文）で参照されていないassetはunusedとみなされます。

diagnosticsプラグインは`unused-asset`コードのdiagnosticsをレポートし、assetのパスとリメディエーションのヒントを含みます。

### 例

```sh
# diagnostics で未使用 asset レポート（例出力）
# unused-asset: content/images/header.png （どのコンテンツでも参照されていない）
# unused-asset: files/config.yaml （どのコンテンツでも参照されていない）

# 未参照 asset を特定するには inspector を使用
riebeckite inspect content --list
# ( 各 content エントリで追跡されている asset を確認 )
```
## 関連用語

- [[orphan|Orphan]]
- [[asset|Asset]]
- [[glossary/content|Content]]

## さらに詳しく

- [Diagnostics](../framework/diagnostics.ja.md)
