---
title: Incremental Build
sidebar:
  hidden: true
---

# Incremental Build

content dependencyと保存したBuild Stateを使って、変わった分だけを再生成するBuildです。宣言した入力が変わっていなければ、未変更のコンテンツと出力を再利用します。

## 仕組み

前回のBuild Stateとfingerprintを比べ、変わったentryを特定します。依存関係を通じて無効化を伝播させ、影響する出力だけを描画し直します。

## 関連用語

- [[build|Build]]
- [[build-state|Build State]]
- [[cache-invalidation|Cache Invalidation]]
- [[fingerprint|Fingerprint]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
