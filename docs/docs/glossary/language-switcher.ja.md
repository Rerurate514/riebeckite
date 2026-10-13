---
title: Language Switcher
sidebar:
  hidden: true
---

# Language Switcher

読み手がページの言語版を行き来できるようにする操作です。l10n Plugin が、翻訳があるときに article metadata の slot へ公開します。

## どこから来るか

l10n Plugin が article metadata の slot を通して switcher を提供するため、どう描画しどこに置くかはサイトが決めます。

## 現れる条件

現在のページに translation が1つ以上あるときだけ現れます。翻訳版のないページには switcher が出ません。
