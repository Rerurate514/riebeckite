---
title: Profiler
sidebar:
  hidden: true
---

# Profiler

 content processing から plugin hooks および output generation に至るまで、 Build のどこに時間がかかるかを計測するビルド時間測定です。 trace span を読み取ってビルドのタイミングをレポートする。

## 役割

 Build phase でかかった時間を計測する。
 記録された span からタイミングをレポートする。

## CLI 使用法

 `riebeckite profile` を実行して trace を収集し、performance report を表示する。
 incremental reuse なしで計測する `riebeckite profile --full` を実行する。

## 関連用語

- [[trace-span|トレーススパン]]
- [[logger|Logger]]
- [[build|ビルド]]

## さらに詳しく

- [Observability](../framework/observability.ja.md)
