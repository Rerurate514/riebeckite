---
title: キャッシュ無効化
sidebar:
  hidden: true
---

# キャッシュ無効化

 recorded dependencies または fingerprints が変更されたキャッシュされたコンテンツをドロップするステップです。無効化されたエントリは再処理され、他のエントリにフィードチェンジが伝播します。

## 役割

 入力が変更されたエントリを削除する。
 変更は依存するコンテンツに伝播する。

## 起きるタイミング

 content dependency の fingerprint が変更されたとき。
 plugin の processedContentCache 契約が違反されたとき。
 cache バージョン不一致または schema 不一致のとき。

## 関連用語

- [[glossary/cache|Cache]]
- [[fingerprint|フィンガープリント]]
- [[glossary/build-dependency|Build 依存性]]
- [[plugin-cache|Plugin cache]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
