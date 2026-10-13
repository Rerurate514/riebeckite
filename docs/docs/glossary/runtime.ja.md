---
title: Runtime
sidebar:
  hidden: true
---

# Runtime

Build の後に、サイトがページを配信し問い合わせに答える段階です。Runtime のコードは、コンテンツを再処理せず manifest とページのデータを読みます。

## runtime と build time

| 段階 | 行うこと |
| --- | --- |
| Build time | コンテンツを処理し、公開位置を解決し、出力を書き出す |
| Runtime | ページを配信し、問い合わせに答える |

## runtime が読むもの

runtime は manifest と用意済みのページデータを読みます。Markdown を再解析しないため、コンテンツを解釈する場所は Build だけです。
