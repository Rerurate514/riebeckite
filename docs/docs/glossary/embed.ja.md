---
title: Embed
sidebar:
  hidden: true
---

# Embed

別のノートの内容を現在のページに取り込む記法で、ノートの埋め込みやblockの埋め込みがあります。リンクと同様に解決し、content dependencyとして追跡します。

## 記法

```md
![[note]]            # ノート全体を埋め込む
![[note#Heading]]    # セクションを埋め込む
![[note#^block-id]]  # block を埋め込む
```

## 解決と依存

embedはWikiLinkと同じくcontent indexから解決し、content dependencyになります。参照元のノートを編集すると、埋め込むページが無効化されます。

## content dependencyの追跡

embedはcontent indexを通じてcontent dependencyとして追跡されます。参照元のノートを編集した場合、そのページは無効化され、次回のビルドで再生成されます。wikilinkがgraphの辺を作るのに対し、embedはページの再生成がトリガーされる依存関係を作ります。

関連項目: [content-dependency](./content-dependency.md)
