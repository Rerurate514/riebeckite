---
date: 2026-10-14
title: ロガー（Logger）
sidebar:
  hidden: true
---

# ロガー（Logger）

ビルド全体で構造化されたイベントとスパンを出力する可観測性のチャネルです。出力はCLI、プロファイラ、インテグレーションが消費します。

## 役割

構造化されたビルドイベントを出力します。CLI、プロファイラ、インテグレーションに供給します。

## 出力するもの

安全な運用メッセージを構造化して出力します。性能上の原因を探すために大量のメッセージを流す場ではありません。それにはプロファイラを使ってください。

## ロガーの詳細

`Logger` インターフェースは、ビルド全体で使う構造化ログのメソッドを提供します。

```ts
interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext, cause?: Error): void;
  child(context: LogContext): Logger;
}
```

`ConsoleLogger` 実装は適切なレベルで `console` に書き込みます。ログメッセージには、構造化された相関のための `LogContext` キーと値のマップが含まれます。各ロガーは `child` メソッドで、追加コンテキストを持つ子ロガーを作れます。

### 例

```ts
import { ConsoleLogger } from "@riebeckite/core";

const logger = new ConsoleLogger({ phase: "build" });
logger.info("Build started");
logger.child({ step: "content" }).info("Processing content");
// Output includes structured context for correlation
```
## 関連用語

- [[trace-span|Trace Span]]
- [[profiler|Profiler]]
- [[glossary/diagnostics|Diagnostics]]

## さらに詳しく

- [Observability](../framework/observability.ja.md)
