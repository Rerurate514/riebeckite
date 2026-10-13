---
title: Persistent Cache
sidebar:
  hidden: true
---

# Persistent Cache

`.riebeckite/cache/content/vN`に保存される、Build間で再利用する処理済みのMarkdownの結果です。cacheに当たればウォームビルドになり、外れれば再処理を強制します。

## Cacheの内容

`.riebeckite/cache/content/v3`に保存されます。entryのキーにはMarkdownのsource、解析済みのfrontmatter、cacheのスキーマ、処理パイプラインのfingerprintが含まれます。cacheしたcontentはワークスペースのパスではなくlogical slugと正規化したsourceのパスを記録するため、同じOSの別の実行環境やワークスペースへコピーできます。

## ヒットとミス

ビルドログは`Persistent content cache`の行で`hits`、`misses`、`bypasses`を報告します。cacheのないコールドビルドはすべてを最初から処理します。ウォームビルドは互換性のあるentryを再利用します。コールドビルドを強制するには`.riebeckite/cache`を削除します。

## 関連用語

- [[glossary/cache|Cache]]
- [[cache-invalidation|Cache Invalidation]]
- [[plugin-cache|Plugin cache]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
