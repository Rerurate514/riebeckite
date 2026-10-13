---
title: Profiler
sidebar:
  hidden: true
---

# Profiler

コンテンツ処理からPluginのhook、出力生成まで、どこに時間がかかるかを計測するBuild時の仕組みです。trace spanを読み、Buildの所要時間を報告します。

## 計測するもの

Buildの各段階の所要時間を計測します。記録したspanから時間を報告します。

## 関連用語

- [[trace-span|Trace Span]]
- [[logger|Logger]]
- [[build|Build]]

## さらに詳しく

- [Observability](../framework/observability.ja.md)
