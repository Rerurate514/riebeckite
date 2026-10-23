---
date: 2026-10-14
title: トレーススパン（Trace Span）
sidebar:
  hidden: true
---

# トレーススパン（Trace Span）

ビルド作業の計測単位です。トレースはビルド作業をスパンに分けて所要時間を記録します。スパン名は安定している必要があります（例：`content.load`、`plugins.run`、`diagnostics.run`、`application.build`）。

## 構造

トレースには親スパン（例：`build`）と、作業単位ごとの子スパンがあります。成功時も失敗時も、必ずスパンを閉じてください。

## 命名規則

ビルド間で比較できる安定したスパン名を使ってください。入力ファイル名によって実行ごとに変わる名前は避けます。

## スパンの構造

トレーススパンは `TraceSpan` 型で表され、name、startTime、durationMs、status、任意のattributesを持ちます。

```ts
type TraceSpan = Readonly<{
  name: string;
  startTime: number;
  durationMs: number;
  status: "ok" | "error";
  attributes: TraceAttributes;
}>;
```

スパンは `TraceSink` インターフェースを通じて `onSpan` コールバックで出力されます。`@riebeckite/core` の `SinkTracer` がスパンを収集し、プロファイラがレポートを生成できるようにします。

### 例：スパンのJSON

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
