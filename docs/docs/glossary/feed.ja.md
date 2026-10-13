---
title: Feed
sidebar:
  hidden: true
---

# Feed

公開されたコンテンツを機械可読に並べたもので、RSS、Atom、JSON Feed などがあります。Feed は discoverable な entry から作り、各 entry の permalink を使います。

## feed が使うもの

- discoverable な entry。unlisted のページは含めません。
- 各 entry の permalink。slug から組み直した URL は使いません。
- frontmatter の title、date、description。

## 形式

| 形式 | 主な用途 |
| --- | --- |
| RSS | 最も広く対応 |
| Atom | 厳密で仕様が明確 |
| JSON Feed | プログラムからの利用 |
