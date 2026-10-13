---
title: Redirect
sidebar:
  hidden: true
---

# Redirect

ノートの正準 permalink を指す追加の URL で、多くの場合は古いアドレスを生かすために使います。redirect は解決済みの公開位置の一部で、permalink を置き換えません。

## redirect が生まれるとき

permalink Plugin、rename、locale の規則が redirect を追加します。ノートは1つの正準 permalink と、任意の数の redirect を持ちます。

## 例

```ts
permalink: "/docs/notes/hello/",
redirects: ["/docs/hello/", "/hello/"],
```
