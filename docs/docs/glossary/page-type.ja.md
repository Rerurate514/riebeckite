---
title: Page Type
sidebar:
  hidden: true
---

# Page Type

Plugin が独自の公開パスと本文を添えて提供するページの種類で、通常の Markdown ではないページに使います。Integration が route を解決し、Application が最終的な HTML を組み立てます。

## page type が提供するもの

- ページの公開パス。
- Integration が描画できる本文。
- incremental build 用の output dependency。

## 境界

page type は HonoX の route やサイトの枠組みを所有しません。ページを宣言し、配置するのは Integration と Application です。
