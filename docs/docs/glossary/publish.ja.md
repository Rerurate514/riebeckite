---
title: Publish
sidebar:
  hidden: true
---

# Publish

コンテンツを公開サイトに含めるかどうかの判定で、publish strategyとpublishedやvisibilityといったfrontmatterで制御します。公開されたコンテンツはpublication boundaryのビューに入ります。

## 判定の入力

- 設定したpublish strategy。
- frontmatterの`published` field。
- frontmatterの`visibility` field。

## 結果

判定を通ったコンテンツはroutableとdiscoverableのビューに入ります。通らなかったコンテンツはdraftとなり、公開集合から外れます。
