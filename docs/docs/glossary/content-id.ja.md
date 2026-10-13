---
title: Content ID
sidebar:
  hidden: true
---

# Content ID

frontmatterに書く安定した識別子で、slugやpermalinkとは独立にノートを指します。ファイルの移動やURLの変更をまたいで残るため、外部から参照するときのキーになります。

## idとslugとpermalink

| 識別子 | 設定する主体 | 変わるタイミング |
| --- | --- | --- |
| `id` | 執筆者（frontmatter） | 編集しない限り変わらない |
| slug | ファイルのパス | ファイルを移動したとき |
| permalink | 公開位置の解決 | URLの規則や設定を変えたとき |

## 使う場面

ノートの名前やURLが変わっても参照し続ける必要がある場合は、idを使います。
