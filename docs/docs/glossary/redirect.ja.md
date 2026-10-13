---
title: Redirect
sidebar:
  hidden: true
---

# Redirect

ノートの正準permalinkを指す追加のURLで、多くの場合は古いアドレスを生かすために使います。redirectは解決済みの公開位置の一部で、permalinkを置き換えません。

## redirectが生まれるとき

permalink Plugin、rename、localeの規則がredirectを追加します。ノートは1つの正準permalinkと、任意の数のredirectを持ちます。

## 例

```ts
permalink: "/docs/notes/hello/",
redirects: ["/docs/hello/", "/hello/"],
```
