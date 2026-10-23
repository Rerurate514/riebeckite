---
date: 2026-10-14
title: Profiler
sidebar:
  hidden: true
---

# Profiler

コンテンツ処理からPluginのhook、出力生成まで、どこに時間がかかるかを計測するBuild時の仕組みです。trace spanを読み、Buildの所要時間を報告します。

## 計測するもの

Buildの各段階の所要時間を計測します。記録したspanから時間を報告します。

## Profiler Report

Profilerレポートはplugin-cacheアクティビティとpersistent-content-cacheアクティビティを分離してレポートします。content-cacheのhits、misses、bypassesを報告します。それぞれのmissの理由（例: `no-entry`や`dependency-changed`）とbypassの理由（例: l10n safe bypass）も含みます。そのため、incrementalな状態を再利用していない温かいビルドでも、キャッシュ内部を読まなくても説明できます。

### diagnosticsの計測

Profilerは`diagnostics.run`spanの所要時間と、diagnosticsが検出したfindingsの件数を表示します。

- total
- error
- warning
- info

diagnosticsがかかった時間と同時に報告された問題の数がわかります。

```
diagnostics.run
├─ duration
├─ total
├─ error
├─ warning
└─ info
```

diagnosticsがビルド時間の大部分を占めている場合、さらに調査するべき合図となります。

### 例

```sh
# トレースを収集してパフォーマンスレポートを表示
riebeckite profile

# incremental 状態を使わずに全体を計測
riebeckite profile --full
```
## 関連用語

- [[trace-span|Trace Span]]
- [[logger|Logger]]
- [[build|Build]]

## さらに詳しく

- [Observability](../framework/observability.ja.md)
