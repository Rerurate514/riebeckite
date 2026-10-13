---
title: SSG
sidebar:
  hidden: true
---

# SSG

 Riebeckite での静的サイト生成で、ビルド前にサイトをファイルにレンダリングする。Core がコンテンツと場所を処理し、integration が HonoX と Vite に接続してルートを描画し、出力を書き込む。

## 役割

 デプロイ前にサイトを静的ファイルにレンダリングする。
 unchanged ルートを再利用するために output cache を使用する。

## Integration

Core がコンテンツと場所を処理し、integration が HonoX と Vite に接続してルートを描画し、出力を書き込む。

## 関連用語

- [[build|ビルド]]
- [[output-inventory|出力インベントリ]]
- [[glossary/deployment|Deployment]]
- [[incremental-build|インクリメンタルビルド]]

## さらに詳しく

- [HonoX Integration](../framework/honox-integration.ja.md)
