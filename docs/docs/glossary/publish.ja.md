---
title: Publish
sidebar:
  hidden: true
---

# Publish

コンテンツを公開サイトに含めるかどうかの判定で、publish strategy と published や visibility といった frontmatter で制御します。公開されたコンテンツは publication boundary のビューに入ります。

## 判定の入力

- 設定した publish strategy。
- frontmatter の `published` field。
- frontmatter の `visibility` field。

## 結果

判定を通ったコンテンツは routable と discoverable のビューに入ります。通らなかったコンテンツは draft となり、公開集合から外れます。
