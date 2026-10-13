---
title: Hreflang
sidebar:
  hidden: true
---

# Hreflang

あるページの言語違いの URL を検索エンジンに伝える link メタデータです。Riebeckite はノートに存在する翻訳からこれを生成します。

## 出力

```html
<link rel='alternate' hreflang='en' href='https://example.com/docs/hello/'>
<link rel='alternate' hreflang='ja' href='https://example.com/ja/docs/hello/'>
```

## 翻訳から生成

リンクはノートの translation から作るため、言語版を追加すればその代替リンクも自動で加わります。
