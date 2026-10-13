---
title: Runtime
sidebar:
  hidden: true
---

# Runtime

Buildの後に、サイトがページを配信し問い合わせに答える段階です。Runtimeのコードは、コンテンツを再処理せずmanifestとページのデータを読みます。

## runtimeとbuild time

| 段階 | 行うこと |
| --- | --- |
| Build time | コンテンツを処理し、公開位置を解決し、出力を書き出す |
| Runtime | ページを配信し、問い合わせに答える |

## runtimeが読むもの

runtimeはmanifestと用意済みのページデータを読みます。Markdownを再解析しないため、コンテンツを解釈する場所はBuildだけです。
