---
title: Attachment
sidebar:
  hidden: true
---

# Attachment

content ツリー内でコンテンツ entry ではなく asset として配信されるファイルです。Attachment は論理パスを保ったまま公開 URL に対応し、何を公開して安全かは publication boundary が決めます。

## attachment と URL

画像、PDF、その他の Markdown 以外のファイルは logical path を保ち、公開 URL に対応します。通常の Markdown リンクや embed で参照します。

## 境界

公開 URL になるのは content ツリー内のファイルだけです。何を公開して安全かは publication boundary が決めるため、root の外にある任意のファイルは公開されません。
