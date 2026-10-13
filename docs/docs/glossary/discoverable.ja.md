---
title: Discoverable
sidebar:
  hidden: true
---

# Discoverable

一覧、feed、ナビゲーションに載せてよいentryを示す公開ビューです。routableでもunlistedのページはURLでは提供しつつ、このビューには含めません。

## discoverableとroutable

| ビュー | 含むもの |
| --- | --- |
| routable | URLと出力を持つすべてのentry |
| discoverable | 一覧やfeedに載せてよいentryのみ |

## 使う側

一覧、feed、discovery系のwidgetがこのビューを読むため、unlistedのページがそこに現れることはありません。
