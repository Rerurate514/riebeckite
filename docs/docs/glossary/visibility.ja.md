---
title: Visibility
sidebar:
  hidden: true
---

# Visibility

公開したページをどう見せるかを細かく決めるfrontmatterのfieldです。ページを下書きにせず、一覧に載せるかどうかを分けます。

## 値

| 値 | URLでの提供 | 一覧への掲載 |
| --- | --- | --- |
| listed（既定） | あり | あり |
| unlisted | あり | なし |

## publishedとの違い

`visibility`は見せ方を調整し、`published`は公開するかどうか自体を決めます。unlistedのページは公開されていますが、一覧からは外れます。
