---
date: 2026-10-08
title: プラグインの独立ページ
---
# プラグインの独立ページ

[[glossary/plugin|プラグイン]]が、サイトのルートを直接追加せずに独立したページを提供するための仕組みです。

たとえば、次のようなページをプラグインから追加したいときに使います。

```text id="9twdpj"
/explore
/report
/tags/example
```

この仕組みがなければ、独立ページを持つプラグインを追加するたびに、[[framework/honox-integration|HonoX]] のルートをサイト側へ書き足す必要があります。プラグインとサイトの結び付きが強くなり、プラグインを配布しても、使う側が同じ変更をしないと動きません。

そこでプラグインは「この URL に、この内容を表示する」という情報だけを公開し、実際のルーティングや HTML 文書の組み立てはサイトが担当します。

```mermaid id="l1m0kn"
flowchart LR
    Plugin["プラグイン"]
    Page["ページ種別<br/>URLと本文"]
    Resolver["共通のルート解決処理"]
    Site["サイトアプリケーション"]
    Browser["ブラウザ"]

    Plugin --> Page
    Page --> Resolver
    Resolver --> Site
    Site --> Browser
```

`pageTypes` は、通常の `RiebeckitePlugin` が持つ機能の1つです。ページ専用の別種類のプラグインを作るわけではありません。

## このページの構成

- [概要](./page-system/overview.ja.md)
- [ページの流れと定義](./page-system/flow-and-authoring.ja.md)
- [サイトとの接続](./page-system/integration.ja.md)
