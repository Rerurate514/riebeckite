---
title: Cache
sidebar:
  hidden: true
---

# Cache

`.riebeckite/`配下に保存する再利用可能なBuildのデータです。Cacheは最適化であり、削除しても公開される出力は変わりません。

## Cacheの保存先

- `.riebeckite/cache` — 処理済みコンテンツとPluginごとのcache。
- `.riebeckite/build/content-state.json` — 前回Buildの状態。
- `.riebeckite/ssg-output-cache.json` — 描画済みの出力。ローカル専用。
前の2つはCIをまたいで保存して問題ありません。output cacheはローカル用で、共有するものではありません。

## Cacheは正本ではない

cacheのentryが欠落・非互換・不安全な場合は、エラーではなくfull buildの経路に入ります。状態はFull Buildの成功後にのみ書き込むため、失敗したBuildは前回の有効な状態を残します。

## 設定

cacheの挙動は`cache`設定で制御します。

```ts
cache: {
  enabled: true,
}
```

## 関連用語

- [[plugin-cache|Plugin cache]]
- [[cache-invalidation|Cache Invalidation]]
- [[build-state|Build State]]
- [[incremental-build|Incremental Build]]

## さらに詳しく

- [Cache](../reference/configuration/cache.ja.md)
