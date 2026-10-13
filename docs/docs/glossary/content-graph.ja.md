---
title: Content Graph
sidebar:
  hidden: true
---

# Content Graph

解決済みのWikiLinkとMarkdownリンクから作られる、コンテンツentry間の関係の網です。どのノートがどれを参照しているかを答え、backlinkや近傍の問い合わせに使います。

## 辺

解決したWikiLinkやMarkdownリンクは、参照元のentryから参照先への有向の辺を作ります。embedも辺を作り、依存として追跡します。

## 問い合わせ

```ts
graph.outgoing(slug);   // このノートが参照する entry
graph.incoming(slug);   // backlink
graph.neighbors(slug);  // 両方向
```

## 拡張

Pluginは独自の関係を追加できるため、Coreを変えずにcustomのつながりを公開できます。
