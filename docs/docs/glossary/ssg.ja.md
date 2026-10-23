---
date: 2026-10-14
title: SSG（静的サイト生成）
sidebar:
  hidden: true
---

# SSG（静的サイト生成）

サイトを事前に静的ファイルへ描画するRiebeckiteの静的サイト生成です。Coreがコンテンツと公開先を担い、インテグレーションがHonoXとViteにつないでルートを描画し、出力を書き出します。

## 役割

デプロイ前にサイトを静的ファイルへ描画します。出力キャッシュを使い、変わっていないルートを再利用します。

## インテグレーション

Coreがコンテンツと公開先を担い、インテグレーションがHonoXとViteにつないでルートを描画し、出力を書き出します。

## 出力キャッシュ

出力キャッシュは、描画済みのルート結果をルートパスとフィンガープリントでキー付けして保存します。後続のビルドでは、変わっていないルートを再描画せずキャッシュから復元します。キャッシュキーは出力一覧の比較から導かれ、前回のビルド以降にどのルートが変わったかが決まります。

### 例

```sh
# Output cache hit — unchanged routes are restored from cache
riebeckite build

# Output cache miss — changed routes are re-rendered
riebeckite build --full
```

## 関連用語

- [[build|Build]]
- [[output-inventory|Output Inventory]]
- [[glossary/deployment|Deployment]]
- [[incremental-build|Incremental Build]]

## さらに詳しく

- [HonoX Integration](../framework/honox-integration.ja.md)
