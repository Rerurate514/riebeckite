---
title: Embed
sidebar:
  hidden: true
---

# Embed

別のノートの内容を現在のページに取り込む記法で、ノートの埋め込みや block の埋め込みがあります。リンクと同様に解決し、content dependency として追跡します。

## 記法

```md
![[note]]            # ノート全体を埋め込む
![[note#Heading]]    # セクションを埋め込む
![[note#^block-id]]  # block を埋め込む
```

## 解決と依存

embed は WikiLink と同じく content index から解決し、content dependency になります。参照元のノートを編集すると、埋め込むページが無効化されます。
