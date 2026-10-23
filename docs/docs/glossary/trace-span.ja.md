---
date: 2026-10-14
title: Trace Span
sidebar:
  hidden: true
---

# Trace Span

Buildのobservabilityにおける名前付きの計測区間で、Pluginのhookやcacheの参照などの文脈のタグを持ちます。SpanはProfilerとobservabilityのイベントに使われます。

## 付く情報

計測のため区間に名前を付けます。Pluginやcacheなどの文脈tagを持ちます。

## Span Structure

trace spanは`TraceSpan`型で表され、name, startTime, durationMs, statusおよびオプションのattributesを持ちます。

```ts
type TraceSpan = Readonly<{
  name: string;
  startTime: number;
  durationMs: number;
  status: "ok" | "error";
  attributes: TraceAttributes;
}>;
```

Spanは`TraceSink`インターフェースを通じて`onSpan`コールバックで発行され、`SinkTracer`はspanを収集してProfilerがレポートを生成できるようにします。

### 例：span JSON

```json
{
  "name": "content.load",
  "startTime": 1700000000000,
  "durationMs": 450,
  "status": "ok",
  "attributes": {
    "source": "content/posts/hello.md",
    "cache": "hit"
  }
}
```
## 関連用語

- [[profiler|Profiler]]
- [[logger|Logger]]
- [[build|Build]]

## さらに詳しく

- [Observability](../framework/observability.ja.md)
