---
title: Discoverable
sidebar:
  hidden: true
---

# Discoverable

一覧、feed、ナビゲーションに載せてよい entry を示す公開ビューです。routable でも unlisted のページは URL では提供しつつ、このビューには含めません。

## discoverable と routable

| ビュー | 含むもの |
| --- | --- |
| routable | URL と出力を持つすべての entry |
| discoverable | 一覧や feed に載せてよい entry のみ |

## 使う側

一覧、feed、discovery 系の widget がこのビューを読むため、unlisted のページがそこに現れることはありません。
