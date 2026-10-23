---
date: 2026-10-14
title: 未使用アセット（Unused Asset）
sidebar:
  hidden: true
---

# 未使用アセット（Unused Asset）

どのコンテンツのfrontmatterからも本文からも参照されていないアセット（画像、ファイルなど）です。未使用アセットは削除して出力サイズを減らせます。

## 追跡

アセットはコンテンツの `assets` フィールドとリンク参照を通じて追跡されます。どこからも追跡されていないアセットは未使用とみなされます。

## 整理

未使用アセットは正しさに影響しませんが、サイズ最適化のために削除できます。公開サイトで参照されていないアセットを特定するには `doctor` か `inspect` を使います。

## アセットの追跡

アセットは、コンテンツの `assets` フィールドとコンテンツ内のリンク参照を通じて追跡されます。診断プラグインはビルド中にアセット参照を監視し、参照されていないアセットを報告します。どのコンテンツのfrontmatter `assets` フィールドからも、リンク参照（`![alt]` やWikiLink構文）からも参照されていないアセットは未使用とみなされます。

診断プラグインは未使用アセットを `unused-asset` コードの診断として報告し、アセットのパスと修正のヒントを含めます。

### 例

```sh
# Diagnostics report unused assets (example output)
# unused-asset: content/images/header.png (not referenced in any content)
# unused-asset: files/config.yaml (not referenced in any content)

# Identify unreferenced assets via inspector
riebeckite inspect content --list
# (check which assets are tracked by each content entry)
```
## 関連用語

- [[orphan|Orphan]]
- [[asset|Asset]]
- [[glossary/content|Content]]

## さらに詳しく

- [Diagnostics](../framework/diagnostics.ja.md)
