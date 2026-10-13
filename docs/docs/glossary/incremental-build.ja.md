---
title: インクリメンタルビルド
sidebar:
  hidden: true
---

# インクリメンタルビルド

コンテンツの依存関係と保存されたビルド状態を利用して、変更された部分のみを再生成するビルドモードです。

## 役割

 unchanged コンテンツと出力の再処理を回避する。
記録された依存関係とビルド状態に依存する。

## 仕組み

前回のビルド以降に変更されたものだけを処理する。
前回のビルド情報は `.riebeckite/build/content-state.json` に保存されている。
以前の情報が存在しない、使用できない、あるいは安全でない場合は full build が実行される。

## 状態の安全性

 incremental state がなくても同じサイトは正しく生成できる。
欠落・非互換・不安全な状態の場合は full build パスが取られる。

## 関連用語

- [[build|ビルド]]
- [[build-state|ビルド状態]]
- [[cache-invalidation|キャッシュ無効化]]
- [[fingerprint|フィンガープリント]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
