---
title: フィンガープリント
sidebar:
  hidden: true
---

# フィンガープリント

 build が変更を検知し、キャッシュ／Build-state 比較を駆動する入力を識別するハッシュです。

## 役割

 入力が変更されたかを検知する。
 fingerprint が保存されているものと異なれば、依存するコンテンツが再処理される。

## 種類

 コンテンツのフィンガープリント: source、 frontmatter、 pipeline fingerprint、 cache schema、 plugin cacheVersion を含む。
 pipeline fingerprint: plugin fingerprint、 content filter、 compatibility version を含む。

## 関連用語

- [[glossary/build-dependency|Build 依存性]]
- [[cache-invalidation|キャッシュ無効化]]
- [[glossary/cache|Cache]]
- [[persistent-cache|永続キャッシュ]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
