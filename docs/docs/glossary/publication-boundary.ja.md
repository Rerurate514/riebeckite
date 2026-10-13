---
title: Publication Boundary
sidebar:
  hidden: true
---

# Publication Boundary

どのコンテンツを公開して安全かを決める規則です。Riebeckite は publish strategy と frontmatter を適用し、公開判定を一箇所に集めます。

## strategy と frontmatter

| 出所 | 例 | 効果 |
| --- | --- | --- |
| publish strategy | `selective` | 公開指定のあるコンテンツだけを公開 |
| frontmatter | `published: false` | ノートを公開集合から外す |
| frontmatter | `visibility: unlisted` | 一覧に載せずノートを提供 |

## 判定を一箇所に

判定を一箇所に集めるため、どの利用側も同じ公開集合を見ます。ページ、feed、sitemap が個別に公開判定をやり直すことはありません。
