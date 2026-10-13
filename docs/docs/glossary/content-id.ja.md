---
title: Content ID
sidebar:
  hidden: true
---

# Content ID

frontmatter に書く安定した識別子で、slug や permalink とは独立にノートを指します。ファイルの移動や URL の変更をまたいで残るため、外部から参照するときのキーになります。

## id と slug と permalink

| 識別子 | 設定する主体 | 変わるタイミング |
| --- | --- | --- |
| `id` | 執筆者（frontmatter） | 編集しない限り変わらない |
| slug | ファイルのパス | ファイルを移動したとき |
| permalink | 公開位置の解決 | URL の規則や設定を変えたとき |

## 使う場面

ノートの名前や URL が変わっても参照し続ける必要がある場合は、id を使います。
