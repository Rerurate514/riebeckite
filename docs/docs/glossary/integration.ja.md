---
title: Integration
sidebar:
  hidden: true
---

# Integration

Core のコンテンツとページを、HonoX や Vite といった描画・配信のスタックにつなぐパッケージです。コンテンツの論理を持たずに、route を描画し出力を書き出します。

## 責務

- route を通してページと Plugin の page type を描画します。
- 生成した出力を書き出します。
- サイトを配信先につなぎます。

## 境界

Core がコンテンツ処理と公開位置の解決を担い、integration が描画と配信を担います。そのため integration を差し替えても、コンテンツの解釈は変わりません。
