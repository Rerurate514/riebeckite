---
title: Profiler
sidebar:
  hidden: true
---

# Profiler

コンテンツ処理から Plugin の hook、出力生成まで、どこに時間がかかるかを計測する Build 時の仕組みです。trace span を読み、Build の所要時間を報告します。

## 役割

- Build の各段階の所要時間を計測します。
- 記録した span から時間を報告します。

## 関連用語

- [[trace-span|Trace Span]]
- [[logger|Logger]]
- [[build|Build]]

## さらに詳しく

- [Observability](../framework/observability.ja.md)
- [CLI](../reference/cli.ja.md)
