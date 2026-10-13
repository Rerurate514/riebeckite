---
title: Plugin Cache
sidebar:
  hidden: true
---

# Plugin Cache

処理済みコンテンツをためる Plugin ローカルの保管で、cacheVersion で版管理します。Plugin は processed-content cache 契約で参加し、宣言した依存が変わらない限り entry を Build 間で再利用できます。

## 役割

- 処理済みコンテンツを Build 間で再利用します。
- 版管理され、宣言した依存と結び付きます。

## 関連用語

- [[plugin|Plugin]]
- [[fingerprint|Fingerprint]]
- [[cache-invalidation|Cache Invalidation]]
- [[glossary/build-dependency|Build Dependency]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
- [Build Dependency Contract](../framework/build-dependency.ja.md)
