---
title: Cache
sidebar:
  hidden: true
---

# Cache

`.riebeckite/` 配下に保存する再利用可能な Build のデータです。Cache は最適化であり、削除しても公開される出力は変わりません。

## Cache の保存先

- `.riebeckite/cache` — 処理済みコンテンツと Plugin ごとの cache。
- `.riebeckite/build/content-state.json` — 前回 Build の状態。
- `.riebeckite/ssg-output-cache.json` — 描画済みの出力。ローカル専用。
前の2つは CI をまたいで保存して問題ありません。output cache はローカル用で、共有するものではありません。

## Cache は正本ではない

cache の entry が欠落・非互換・不安全な場合は、エラーではなく full build の経路に入ります。状態は Build の成功後にのみ書き込むため、失敗した Build は前回の有効な状態を残します。

## 設定

cache の挙動は `cache` 設定で制御します。

```ts
cache: {
  enabled: true,
}
```

## 関連用語

- [[plugin-cache|Plugin cache]]
- [[cache-invalidation|キャッシュ無効化]]
- [[build-state|ビルド状態]]
- [[incremental-build|インクリメンタルビルド]]

## さらに詳しく

- [Cache](../reference/configuration/cache.ja.md)
