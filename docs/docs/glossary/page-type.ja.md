---
title: Page Type
sidebar:
  hidden: true
---

# Page Type

Pluginが独自の公開パスと本文を添えて提供するページの種類で、通常のMarkdownではないページに使います。Integrationがrouteを解決し、Applicationが最終的なHTMLを組み立てます。

## page typeが提供するもの

- ページの公開パス。
- Integrationが描画できる本文。
- incremental build用のoutput dependency。

## 境界

page typeはHonoXのrouteやサイトの枠組みを所有しません。ページを宣言し、配置するのはIntegrationとApplicationです。
