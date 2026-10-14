---
title: Redirect
sidebar:
  hidden: true
---

# Redirect

ノートの正準permalinkを指す追加のURLで、多くの場合は古いアドレスを生かすために使います。redirectは解決済みの公開位置の一部で、permalinkを置き換えません。

## redirectが生まれるとき

permalink Plugin、rename、localeの規則がredirectを追加します。ノートは1つの正典permalinkと、任意の数のredirectを持ちます。redirectは解決済みの公開位置の一部で、permalinkを置き換えません。

## redirectの型と構造

redirectは`ContentRedirect`(`packages/core/src/types/content_manifest.ts`)で、pathとstatusコードを持ちます。manifestの`redirects`マップでpathをキーとして格納され、`publicRedirects`でも公開エントリのために格納されます。

example `ContentRedirect`:

```ts
{
  path: "/docs/hello/",
  status: 301,
}
```

manifest entry内のredirects例:

```ts
permalink: "/docs/notes/hello/",
redirects: ["/docs/hello/", "/hello/"],
```

redirectはpermalink pluginによって`resolveContentLocations`hookを通じて生成されたり、content fileがリネームされた際に古いパスが新しいpermalinkに向かうリダイレクトとして自動的に生成されたりします。
