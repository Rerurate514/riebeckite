---
title: Build 依存性
sidebar:
  hidden: true
---

# Build 依存性

Core とプラグインの間の契約で、processed content と emitted files がビルド間で入力にどのように依存するかを宣言する。

## Content dependency

plugin は `processedContentCache` に `dependencyMode` (none, tracked, global, unsafe) を宣言する。
Core は Core の content API 経由で行われた読み取りを依存関係として記録し、stable identities を持つ。
content、 file、 link 依存関係が記録され、後のビルドで比較される。

## Output dependency

Output dependency は Content dependency とは独立している。
種類には `content`, `tag`, `folder`, `global`, `unknown` がある。
変更後に Core が再度書き込むべき emitted files を決めるために使用される。

## 関連用語

- [[cache-invalidation|キャッシュ無効化]]
- [[output-dependency|出力依存性]]
- [[fingerprint|フィンガープリント]]
- [[plugin-dependency|Plugin dependency]]

## さらに詳しく

- [Build Dependency](../framework/build-dependency.ja.md)
