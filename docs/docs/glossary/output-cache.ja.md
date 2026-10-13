---
title: Output Cache
sidebar:
  hidden: true
---

# Output Cache

`.riebeckite/ssg-output-cache.json`に保存される、SSGの出力ルートとファイルをためるcacheです。Incremental SSGで再利用するためのもので、ローカル専用であり、CIの実行環境間で共有することは想定していません。

## 目的

現在のmanifestをBuildしたあと、Coreは出力記述子を前回の成功した状態と比較します。HonoXは影響するcontentとPluginページのルートだけを描画し、変わっていないGenerated Outputは出力cacheから復元し、サイトが所有しなくなった出力は削除します。

## ローカル専用

出力cacheは転送のコストが利点を上回るため、ローカルに留めます。`.riebeckite/build/content-state.json`と`.riebeckite/ssg-output-cache.json`を削除すると、すべての出力の再生成を強制できます。

## 関連用語

- [[ssg|SSG]]
- [[output-inventory|Output Inventory]]
- [[glossary/cache|Cache]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
