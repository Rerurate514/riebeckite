---
title: Routable
sidebar:
  hidden: true
---

# Routable

URL で提供する entry を示す公開ビューで、unlisted の entry も含みます。ルーティングと出力生成は、discoverable ではなくこのビューを使います。

## ビューに含まれるもの

URL と出力を受け取るすべての entry です。unlisted のページも routable で、一覧からは外しつつ URL では提供します。

## 使う側

ルーティングと出力生成がこのビューを読みます。routable でないページは出力を作りません。
