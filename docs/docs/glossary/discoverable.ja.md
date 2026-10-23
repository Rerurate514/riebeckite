---
date: 2026-10-14
title: 検出可能（Discoverable）
sidebar:
  hidden: true
---

# 検出可能（Discoverable）

一覧、フィード、ナビゲーションに載せてよいエントリを示す公開ビューです。ルーティング対象でもunlistedのページはURLで配信されますが、このビューには含まれません。

## 検出可能とルーティング対象

| ビュー | 含むもの |
| --- | --- |
| ルーティング対象 | URLと出力を持つすべてのエントリ |
| 検出可能 | 一覧やフィードに載せてよいエントリだけ |

## 使う側

一覧、フィード、発見用のウィジェットがこのビューを読むため、unlistedのページがそこに現れることはありません。

## ContentManifestの検出可能ビュー

`ContentManifest`は`discoverableEntries`ビューを提供し、公開状態に基づいてエントリを絞り込みます。このビューに現れるのは、`routable: true`かつ`discoverable: true`のエントリだけです。つまり：

- `visibility: "public"`のエントリは含まれます
- `visibility: "unlisted"`のエントリは除外されます（ルーティング対象ですが検出可能ではありません）
- `visibility: "draft"`と`visibility: "scheduled"`のエントリは除外されます

タクソノミープラグイン、シリーズプラグイン、フィード、ナビゲーションのウィジェットはすべて`discoverableEntries`を読むため、unlistedのページはURLで配信されても、一覧やフィードには現れません。

```ts
// From packages/core/src/types/content_manifest.ts
interface ContentManifest {
  discoverableEntries: ContentManifestEntry[];
  // Entries where resolvePublishingState gives discoverable: true
}
```
