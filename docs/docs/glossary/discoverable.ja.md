---
date: 2026-10-14
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

## ContentManifestのdiscoverableビュー

`ContentManifest`は`discoverableEntries`ビューを提供し、公開状態に基づいてエントリをフィルタリングします。このビューに表示されるのは、`routable: true`で`discoverable: true`であるエントリのみです。つまり：

- `visibility: "public"`のエントリは含まれます
- `visibility: "unlisted"`のエントリは除外されます（routableですがdiscoverableではありません）
- `visibility: "draft"`および`visibility: "scheduled"`のエントリは除外されます

taxonomyプラグイン、seriesプラグイン、feed、ナビゲーションウィジェットはすべて`discoverableEntries`から読み込むため、unlistedページは一覧やfeedに決して現れません。URLでは提供されますが、discoveryの対象外です。
