---
title: Logical Path
sidebar:
  hidden: true
---

# Logical Path

content rootを基準に表した、コンテンツファイルの位置です。Riebeckiteはlogical pathを安定して保ち、公開パスへは別に対応させます。

## logical path

`content/notes/hello.md`のlogical pathは`notes/hello`です。content systemが扱うのはこのlogical pathで、公開URLと同じとは限りません。

## 公開パスへの対応

公開位置の解決がlogical pathをpublic pathに対応させます。folder pageやpermalinkの規則を使えば、ファイルを移動せずに対応を変えられます。
