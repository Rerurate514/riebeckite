---
title: Logical Path
sidebar:
  hidden: true
---

# Logical Path

content root を基準に表した、コンテンツファイルの位置です。Riebeckite は logical path を安定して保ち、公開パスへは別に対応させます。

## logical path

`content/notes/hello.md` の logical path は `notes/hello` です。content system が扱うのはこの logical path で、公開 URL と同じとは限りません。

## 公開パスへの対応

公開位置の解決が logical path を public path に対応させます。folder page や permalink の規則を使えば、ファイルを移動せずに対応を変えられます。
