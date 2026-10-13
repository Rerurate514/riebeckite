---
title: Visibility
sidebar:
  hidden: true
---

# Visibility

公開したページをどう見せるかを細かく決める frontmatter の field です。ページを下書きにせず、一覧に載せるかどうかを分けます。

## 値

| 値 | URL での提供 | 一覧への掲載 |
| --- | --- | --- |
| listed（既定） | あり | あり |
| unlisted | あり | なし |

## published との違い

`visibility` は見せ方を調整し、`published` は公開するかどうか自体を決めます。unlisted のページは公開されていますが、一覧からは外れます。
