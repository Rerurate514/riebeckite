---
title: Feed
sidebar:
  hidden: true
---

# Feed

公開されたコンテンツを機械可読に並べたもので、RSS、Atom、JSON Feedなどがあります。Feedはdiscoverableなentryから作り、各entryのpermalinkを使います。

## feedが使うもの

- discoverableなentry。unlistedのページは含めません。
- 各entryのpermalink。slugから組み直したURLは使いません。
- frontmatterのtitle、date、description。

## 形式

| 形式 | 主な用途 |
| --- | --- |
| RSS | 最も広く対応 |
| Atom | 厳密で仕様が明確 |
| JSON Feed | プログラムからの利用 |
