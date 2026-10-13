---
title: Content
sidebar:
  hidden: true
---

# Content

Markdown の解析と Plugin 処理を経たコンテンツです。frontmatter、レンダリング済みの HTML、解決済みの公開位置を持ちます。Riebeckite ではファイルを生の Markdown としてではなく、Content System を通して扱います。

## 役割

- Content Manager が処理し、manifest に記録する単位です。
- 内部では slug で参照し、公開時は permalink で到達します。

## 関連用語

- [[content-entry|Content Entry]]
- [[content-manager|Content Manager]]
- [[manifest|Manifest]]
- [[slug|Slug]]

## さらに詳しく

- [Content System](../framework/content-system.ja.md)
