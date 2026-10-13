---
title: Logger
sidebar:
  hidden: true
---

# Logger

Build全体で構造化されたイベントとspanを出すobservabilityの経路です。その出力はCLI、Profiler、Integrationが受け取ります。

## 役割

構造化されたBuildのイベントを出します。CLI、Profiler、Integrationに供給します。

## 出す内容

安全な運用に必要なメッセージを構造化して出します。性能の原因を調べるときは大量のメッセージを出さず、Profilerを使います。

## 関連用語

- [[trace-span|Trace Span]]
- [[profiler|Profiler]]
- [[glossary/diagnostics|Diagnostics]]

## さらに詳しく

- [Observability](../framework/observability.ja.md)
