---
date: 2026-10-14
title: リダイレクト（Redirect）
sidebar.hidden: true
---

# リダイレクト（Redirect）

ノートの正規 permalink を指す追加の URL で、通常は古いアドレスを生かすために使います。リダイレクトは解決済みの公開先の一部で、permalink を置き換えません。

## リダイレクトが生まれるとき

[permalink](./permalink.md)プラグイン、名前変更、ロケールの規則がリダイレクトを追加できます。ノートは正規の permalink を1つ保ち、リダイレクトはいくつでも持てます。リダイレクトは解決済みの公開先の一部で、permalink を置き換えません。

## リダイレクトの型と構造

リダイレクトは `ContentRedirect`（`packages/core/src/types/content_manifest.ts`）として型付けされ、`path` と `status` コードを持ちます。マニフェストの `redirects` マップにリダイレクトパスをキーとして保存され、公開エントリでは `publicRedirects` にも保存されます。

`ContentRedirect` の例：

```ts
{
  path: "/docs/hello/",
  status: 301,
}
```

マニフェストエントリ内のリダイレクトの例：

```ts
permalink: "/docs/notes/hello/",
redirects: [
  { path: "/docs/hello/", status: 301 },
  { path: "/hello/", status: 301 },
],
```

リダイレクトは、permalink プラグインが `resolveContentLocations` フックを通じて生成するほか、コンテンツファイルの名前変更時に自動で生成されます（古いパスから新しい permalink へのリダイレクトが付きます）。
