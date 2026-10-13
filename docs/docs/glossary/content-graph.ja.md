---
title: Content Graph
sidebar:
  hidden: true
---

# Content Graph

解決済みの WikiLink と Markdown リンクから作られる、コンテンツ entry 間の関係の網です。どのノートがどれを参照しているかを答え、backlink や近傍の問い合わせに使います。

## 辺

解決した WikiLink や Markdown リンクは、参照元の entry から参照先への有向の辺を作ります。embed も辺を作り、依存として追跡します。

## 問い合わせ

```ts
graph.outgoing(slug);   // このノートが参照する entry
graph.incoming(slug);   // backlink
graph.neighbors(slug);  // 両方向
```

## 拡張

Plugin は独自の関係を追加できるため、Core を変えずに custom のつながりを公開できます。
