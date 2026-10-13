---
title: Logger
sidebar:
  hidden: true
---

# Logger

 build 全体を通して emit される structured events と spans の observability チャンネルです。その出力は CLI、profiler、 および integration に消費される。

## 役割

 structured build events を emit する。
 CLI、profiler、 および integration にフィードする。

## 信号

 構造化された safe な operational messages。
 performance の原因を探るための flood of messages は避け、profiler を使用すること。

## 関連用語

- [[trace-span|トレーススパン]]
- [[profiler|Profiler]]
- [[glossary/diagnostics|Diagnostics]]

## さらに詳しく

- [Observability](../framework/observability.ja.md)
