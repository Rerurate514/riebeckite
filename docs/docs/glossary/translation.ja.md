---
title: Translation
sidebar:
  hidden: true
---

# Translation

同じコンテンツの言語違いを結び付ける対応で、frontmatter で設定します。翻訳の対応があることで、リンクと graph が読み手の言語に従えます。

## 設定

```yaml
---
translation: getting-started
lang: ja
---
```

## リンクの書き換え

読み手の言語の翻訳がある場合、そのノートへのリンクと WikiLink はその版へ解決します。翻訳が無ければ、元の対象のままです。
