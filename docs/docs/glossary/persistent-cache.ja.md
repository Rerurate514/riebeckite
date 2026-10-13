---
title: 永続キャッシュ
sidebar:
  hidden: true
---

# 永続キャッシュ

 `.riebeckite/cache/content/vN` 下に保存された、ビルド間で再利用される処理済み Markdown 結果です。cache hit があると warm build になり、miss があると再処理が強制される。

## Cache  contents

 `.riebeckite/cache/content/v3` 下に保存されている。
 エントリのキーには Markdown source、 parsed frontmatter、 the cache schema、 および processing-pipeline fingerprint が含まれる。
 Cached content は workspace paths ではなく logical slugs と normalized source paths を記録するため、同じ OS の異なるランナーまたはワークスペースにコピーできる。

## Hits, misses, and bypasses

 build log は `Persistent content cache` ラインで `hits`, `misses`, `bypasses` を報告する。
 cache なしの cold build はすべてスクラッチから処理する。 warm build は互換性のあるエントリを再利用する。
 cold build を強制するには `.riebeckite/cache` を削除する。

## 関連用語

- [[glossary/cache|Cache]]
- [[cache-invalidation|キャッシュ無効化]]
- [[plugin-cache|Plugin cache]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
