---
title: Publish Strategy
sidebar:
  hidden: true
---

# Publish Strategy

コンテンツをどう公開するかを決める設定値で、すべて公開するか、公開指定のあるものだけを公開するかを選びます。Publication Boundaryの既定側を定めます。

## 値

| strategy | 挙動 |
| --- | --- |
| all | frontmatterで除外しない限り公開 |
| selective | 公開指定のあるコンテンツだけを公開 |

## frontmatterとの関係

strategyが既定を決め、`published`などのfrontmatterがそれを調整します。両者でpublication boundaryを構成します。
