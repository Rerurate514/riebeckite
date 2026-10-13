---
title: Block ID
sidebar:
  hidden: true
---

# Block ID

段落やblockに付ける短い識別子で、見出しなしでそのblockを直接リンク・埋め込みできるようにします。

## 記法

```md
この段落を参照できます。 ^intro

![[note#^intro]] で埋め込めます。
```

## 用途

block idを使うと、embedやWikiLinkがノート全体やセクションではなく、1つのblockを対象にできます。
