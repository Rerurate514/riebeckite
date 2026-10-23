---
date: 2026-10-14
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

## block IDの解決

`^intro`のようなblock IDは、embedとwikilinkの処理中にcontent indexによって解決されます。IDはソースノート内のアンカーとマッチングされ、`![[note#^intro]]`（embed）や`[[note#^intro]]`（wikilink）のパターンに従って解決されます。

## block IDとcontent dependency

block IDがembedで使用された場合`![[note#^intro]]`、埋め込みページはソースノートのcontent dependencyとなります。ソースノートのblockが編集されると、埋め込みページは無効化され、次回のビルドで再生成されます。
