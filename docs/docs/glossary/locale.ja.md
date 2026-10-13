---
title: Locale
sidebar:
  hidden: true
---

# Locale

サイトやページが書かれている言語と地域の識別子で、enやjaなどです。既定のlocaleは、URLに接頭辞を付けずに配信する言語を決めます。

## 既定localeと接頭辞

| 設定 | 効果 |
| --- | --- |
| `defaultLang: en` | 英語は接頭辞なしで配信 |
| `languages: [en, ja]` | 日本語は`/ja/`の下で配信 |

## ページごとの言語

ページのlocaleはfrontmatterの`lang`fieldかファイル名の接尾辞から決まります。これがURLの接頭辞を決めます。
