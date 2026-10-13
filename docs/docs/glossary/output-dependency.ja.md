---
title: Output Dependency
sidebar:
  hidden: true
---

# Output Dependency

出力が何に依存するかの宣言で、output inventoryを前回の状態と比べたときにどの出力を再生成するかを決めます。contentの出力は`content`型の依存を持ち、Generated Outputは任意の型を持てます。

## 依存の宣言

各出力は依存の型と対象を持ちます。依存を宣言しない出力は`unknown`として扱われ、すべての出力の再生成を引き起こします。

## 比較

Buildはoutput inventoryを前回の成功した状態と比べ、影響する出力、変わっていない出力、削除された出力を求めます。依存の宣言がこの比較の精度を決めます。

## 関連用語

- [[glossary/build-dependency|Build Dependency]]
- [[fingerprint|Fingerprint]]
- [[output-inventory|Output Inventory]]
- [[glossary/cache|Cache]]

## さらに詳しく

- [Output Dependency](../framework/build-dependency.ja.md)
