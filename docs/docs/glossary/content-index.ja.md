---
title: Content Index
sidebar:
  hidden: true
---

# Content Index

WikiLink や embed を解決するための、小文字化した名前からノートへの対応表です。複数のノートに一致する名前は載せず、誤った解決を避けて diagnostic として報告します。

## キーとパスの後方一致

`guides/localization.md` のノートは、`localization`、`guides/localization`、フルパスの各キーで登録されます。そのため `[[localization]]` も `[[guides/localization]]` も解決します。

frontmatter の alias も追加のキーとして登録します。

## 曖昧さ

2つのノートが同じキーを登録すると、そのキーは対応表から外し、報告します。リンクは誤ったノートを指さず、未解決のまま残ります。

曖昧な名前へ意図的にリンクする場合は、明示的なパス形式を使います。

```md
[[glossary/theme|theme]]
```
