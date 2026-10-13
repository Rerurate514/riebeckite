---
title: Routable
sidebar:
  hidden: true
---

# Routable

URLで提供するentryを示す公開ビューで、unlistedのentryも含みます。ルーティングと出力生成は、discoverableではなくこのビューを使います。

## ビューに含まれるもの

URLと出力を受け取るすべてのentryです。unlistedのページもroutableで、一覧からは外しつつURLでは提供します。

## 使う側

ルーティングと出力生成がこのビューを読みます。routableでないページは出力を作りません。
