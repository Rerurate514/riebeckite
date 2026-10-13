---
title: WikiLink
sidebar:
  hidden: true
---

# WikiLink

ノート同士をつなぎ、content graphに関係を作る`[[link]]`記法です。Riebeckiteはcontent indexを通して解決し、解決できないリンクはdiagnosticとして残します。

## 記法

```md
[[target]]              # 名前でリンク
[[target|label]]        # ラベル付きでリンク
[[target#Heading]]      # 見出しへリンク
[[glossary/theme]]      # 曖昧な名前は明示パス
```

## 解決

対象は小文字化したうえでcontent indexから引きます。一致すればgraphの辺を作り、見つからなければ壊れたリンクとして描画し、diagnosticで報告します。
