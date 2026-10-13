---
title: Attachment
sidebar:
  hidden: true
---

# Attachment

contentツリー内でコンテンツentryではなくassetとして配信されるファイルです。Attachmentは論理パスを保ったまま公開URLに対応し、何を公開して安全かはpublication boundaryが決めます。

## attachmentとURL

画像、PDF、その他のMarkdown以外のファイルはlogical pathを保ち、公開URLに対応します。通常のMarkdownリンクやembedで参照します。

## 境界

公開URLになるのはcontentツリー内のファイルだけです。何を公開して安全かはpublication boundaryが決めるため、rootの外にある任意のファイルは公開されません。
