---
title: Page
sidebar:
  hidden: true
---

# Page

サイトが URL で提供する、ルーティング可能なコンテンツです。Markdown から作られる場合と、Plugin の page type から作られる場合があり、Integration が route を通して描画します。

## Markdown のページと Plugin のページ

ほとんどのページは Markdown から作られます。page type を使うと、Plugin が index や生成した一覧など、通常の Markdown ではないページを提供できます。

## 描画

Integration がページの route を解決し、Application が最終的な HTML を組み立てます。Plugin が渡すのは本文で、サイトの枠組みではありません。
