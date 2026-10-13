---
title: WikiLink
sidebar:
  hidden: true
---

# WikiLink

ノート同士をつなぎ、content graph に関係を作る `[[link]]` 記法です。Riebeckite は content index を通して解決し、解決できないリンクは diagnostic として残します。

## 記法

```md
[[target]]              # 名前でリンク
[[target|label]]        # ラベル付きでリンク
[[target#Heading]]      # 見出しへリンク
[[glossary/theme]]      # 曖昧な名前は明示パス
```

## 解決

対象は小文字化したうえで content index から引きます。一致すれば graph の辺を作り、見つからなければ壊れたリンクとして描画し、diagnostic で報告します。
