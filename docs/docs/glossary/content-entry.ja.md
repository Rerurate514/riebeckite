---
title: Content Entry
sidebar:
  hidden: true
---

# Content Entry

manifest の中で slug により識別される、解決済みのコンテンツ 1 件です。permalink、公開位置、frontmatter、公開状態、HTML、Plugin が付与したデータを持ちます。

## entry が持つもの

- `slug` — 内部のキーです。
- `publicLocation` — 解決済みの permalink、redirect、メタデータです。
- `frontmatter` — 解析済みのメタデータです。
- `html` — 描画済みの本文です。
- body slot や head tag など、Plugin が付与したデータです。

## slug と permalink の違い

slug は Build の内部で entry を識別し、permalink は公開 URL です。entry へリンクする側は slug ではなく、entry の permalink を読みます。
