---
title: SSG
sidebar:
  hidden: true
---

# SSG

サイトを事前にファイルへ描画するRiebeckiteの静的サイト生成です。Coreがコンテンツと公開位置を担い、IntegrationがHonoXとViteにつないでrouteを描画し、出力を書き出します。

## 出力の再利用

HonoXは影響するrouteだけを描画し、変わっていない出力はoutput cacheから復元します。どの出力を描画するかはoutput inventoryの比較で決まります。

## 出力キャッシュ

出力キャッシュはルートパスとfingerprintでキーを持ち、変更のないrouteは再描画せずキャッシュから復元します。output inventoryの比較で変更があったrouteのみが再描画の対象となります。

### 例

```sh
# キャッシュヒット：変更のないrouteはキャッシュから復元されます
riebeckite build

# キャッシュミス：変更があったrouteは再描画されます
riebeckite build --full
```

## 関連用語

- [[build|Build]]
- [[output-inventory|Output Inventory]]
- [[glossary/deployment|Deployment]]
- [[incremental-build|Incremental Build]]

## さらに詳しく

- [HonoX Integration](../framework/honox-integration.ja.md)
