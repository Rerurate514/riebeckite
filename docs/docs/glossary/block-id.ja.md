---
title: Block ID
sidebar:
  hidden: true
---

# Block ID

段落や block に付ける短い識別子で、見出しなしでその block を直接リンク・埋め込みできるようにします。

## 記法

```md
この段落を参照できます。 ^intro

![[note#^intro]] で埋め込めます。
```

## 用途

block id を使うと、embed や WikiLink がノート全体やセクションではなく、1つの block を対象にできます。
