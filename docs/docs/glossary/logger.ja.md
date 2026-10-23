---
date: 2026-10-14
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

## Logger Details

`Logger`インターフェースはビルド全体で利用できる構造化されたログ方法を提供します。

```ts
interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext, cause?: Error): void;
  child(context: LogContext): Logger;
}
```

`ConsoleLogger`実装は適切なレベルで`console`に書き込みます。ログメッセージには相関関係のための`LogContext`キーバリュー マップが含まれます。`child`メソッドを使用して、追加のコンテキストを持つ子ロガーを作成できます。

### 例

```ts
import { ConsoleLogger } from "@riebeckite/core";

const logger = new ConsoleLogger({ phase: "build" });
logger.info("Build started");
logger.child({ step: "content" }).info("Processing content");
// 出力は相関関係のための構造化されたコンテキストを含みます
```
## 関連用語

- [[trace-span|Trace Span]]
- [[profiler|Profiler]]
- [[glossary/diagnostics|Diagnostics]]

## さらに詳しく

- [Observability](../framework/observability.ja.md)
