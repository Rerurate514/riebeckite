---
title: SSG
sidebar:
  hidden: true
---

# SSG

サイトを事前にファイルへ描画するRiebeckiteの静的サイト生成です。Coreがコンテンツと公開位置を担い、IntegrationがHonoXとViteにつないでrouteを描画し、出力を書き出します。

## 出力の再利用

HonoXは影響するrouteだけを描画し、変わっていない出力はoutput cacheから復元します。どの出力を描画するかはoutput inventoryの比較で決まります。

## 関連用語

- [[build|Build]]
- [[output-inventory|Output Inventory]]
- [[glossary/deployment|Deployment]]
- [[incremental-build|Incremental Build]]

## さらに詳しく

- [HonoX Integration](../framework/honox-integration.ja.md)
