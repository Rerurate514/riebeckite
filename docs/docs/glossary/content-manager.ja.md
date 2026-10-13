---
title: Content Manager
sidebar:
  hidden: true
---

# Content Manager

走査済みの entry を完成した manifest に変えるコンポーネントです。公開位置を解決し、Markdown と Plugin のパイプラインを実行してから、content graph と query 用の index を作ります。

## 役割

- 処理全体を調整し、結果を manifest に記録します。
- 公開位置の解決と manifest の構築を担い、ファイルの読み取りは行いません。

## 関連用語

- [[content-source|Content Source]]
- [[manifest|Manifest]]
- [[content-graph|Content Graph]]
- [[slug|Slug]]

## さらに詳しく

- [Content System](../framework/content-system.ja.md)
