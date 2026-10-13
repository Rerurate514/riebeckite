---
title: Content Entry
sidebar:
  hidden: true
---

# Content Entry

manifestの中でslugにより識別される、解決済みのコンテンツ1件です。permalink、公開位置、frontmatter、公開状態、HTML、Pluginが付与したデータを持ちます。

## entryが持つもの

- `slug` — 内部のキーです。
- `publicLocation` — 解決済みのpermalink、redirect、メタデータです。
- `frontmatter` — 解析済みのメタデータです。
- `html` — 描画済みの本文です。
- body slotやhead tagなど、Pluginが付与したデータです。

## slugとpermalinkの違い

slugはBuildの内部でentryを識別し、permalinkは公開URLです。entryへリンクする側はslugではなく、entryのpermalinkを読みます。
