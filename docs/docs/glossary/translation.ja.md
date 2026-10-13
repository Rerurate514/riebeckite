---
title: Translation
sidebar:
  hidden: true
---

# Translation

同じコンテンツの言語違いを結び付ける対応で、frontmatterで設定します。翻訳の対応があることで、リンクとgraphが読み手の言語に従えます。

## 設定

```yaml
---
translation: getting-started
lang: ja
---
```

## リンクの書き換え

読み手の言語の翻訳がある場合、そのノートへのリンクとWikiLinkはその版へ解決します。翻訳が無ければ、元の対象のままです。
