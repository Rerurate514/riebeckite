---
title: Publish Strategy
sidebar:
  hidden: true
---

# Publish Strategy

コンテンツをどう公開するかを決める設定値で、すべて公開するか、公開指定のあるものだけを公開するかを選びます。Publication Boundary の既定側を定めます。

## 値

| strategy | 挙動 |
| --- | --- |
| all | frontmatter で除外しない限り公開 |
| selective | 公開指定のあるコンテンツだけを公開 |

## frontmatter との関係

strategy が既定を決め、`published` などの frontmatter がそれを調整します。両者で publication boundary を構成します。
