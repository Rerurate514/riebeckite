---
title: SSG
sidebar:
  hidden: true
---

# SSG

サイトを事前にファイルへ描画する Riebeckite の静的サイト生成です。Core がコンテンツと公開位置を担い、Integration が HonoX と Vite につないで route を描画し、出力を書き出します。

## 役割

- デプロイ前にサイトを静的ファイルへ描画します。
- output cache を使い、未変更の route を再利用します。

## 関連用語

- [[build|Build]]
- [[output-inventory|Output Inventory]]
- [[glossary/deployment|Deployment]]
- [[incremental-build|Incremental Build]]

## さらに詳しく

- [HonoX Integration](../framework/honox-integration.ja.md)
- [Build System](../framework/build-system.ja.md)
