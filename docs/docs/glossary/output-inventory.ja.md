---
title: 出力インベントリ
sidebar:
  hidden: true
---

# 出力インベントリ

public entries、 redirects、 plugin pages、 および generated outputs から作成されたパスキーのすべての生成された出力の記録です。Build はこれを以前の successful state と比較し、affected、 unchanged、 および removed outputs を見つける。

## 含まれるもの

 Build が所有するすべての出力リスト: content outputs、 redirect outputs、 plugin-page outputs、 および generated outputs。
 どの出力が描画、再利用、 削除されるかを駆動する。

## 比較

previous successful state と比較して affected、 unchanged、 および removed outputs を決定する。
 build log は `SSG outputs` ラインで `rendered`, `reused`, および `removed` カウントを報告する。

## 関連用語

- [[build|ビルド]]
- [[ssg|SSG]]
- [[glossary/build-dependency|Build 依存性]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
