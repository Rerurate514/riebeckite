---
title: Page
sidebar:
  hidden: true
---

# Page

サイトがURLで提供する、ルーティング可能なコンテンツです。Markdownから作られる場合と、Pluginのpage typeから作られる場合があり、Integrationがrouteを通して描画します。

## MarkdownのページとPluginのページ

ほとんどのページはMarkdownから作られます。page typeを使うと、Pluginがindexや生成した一覧など、通常のMarkdownではないページを提供できます。

## 描画

Integrationがページのrouteを解決し、Applicationが最終的なHTMLを組み立てます。Pluginが渡すのは本文で、サイトの枠組みではありません。
