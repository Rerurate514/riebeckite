---
date: 2026-10-14
title: 孤立ページ（Orphan）
sidebar:
  hidden: true
---

# 孤立ページ（Orphan）

どの公開ページや他のコンテンツからも参照されていないコンテンツやアセットです。孤立は、削除したはずのコンテンツが残っていることや、整理すべきコンテンツがあることを示す場合があります。

## 検出

他のコンテンツからリンクされておらず、マニフェストにも載っていないコンテンツ。どのコンテンツのfrontmatterからも本文からも参照されていないアセット。

## 扱い

孤立はビルド失敗にはなりませんが、古いコンテンツが残っている可能性を示します。プロジェクト全体の健全性を診断するには `check` か `doctor` を使います。不要になった孤立コンテンツやアセットは削除してください。

## 診断による孤立の検出

孤立の検出は診断の設定で有効にします。有効にすると、ビルドを止めずに孤立したエントリが報告されます。診断プラグインはコンテンツグラフの到達可能性を調べ、他のコンテンツからリンクされておらずマニフェストにも載っていないコンテンツを孤立として記録します。

### 例

```sh
# Enable orphan reporting in diagnostics
# (configure via diagnostics plugin settings)

# Orphan report output (example)
# 3 orphan notes detected:
#   - note-404 (no incoming links, not in manifest)
#   - note-draft (linked only in draft folder, excluded from publish)
# Use `inspect content --list` to see which entries are unreachable.
```
## 関連用語

- [[unused-asset|Unused Asset]]
- [[glossary/content|Content]]
- [[glossary/diagnostics|Diagnostics]]

## さらに詳しく

- [Diagnostics](../framework/diagnostics.ja.md)
