---
date: 2026-10-14
title: プロファイラ（Profiler）
sidebar:
  hidden: true
---

# プロファイラ（Profiler）

コンテンツ処理からプラグインのフック、出力生成まで、どこに時間がかかるかを計測するビルド時の仕組みです。トレーススパンを読み、ビルドの所要時間を報告します。

## 役割

ビルドの各段階の所要時間を計測します。記録したスパンから所要時間を報告します。

## CLIでの使い方

`riebeckite profile` を実行すると、トレースを収集してパフォーマンスレポートを表示します。増分再利用なしで計測するには `riebeckite profile --full` を使います。

## プロファイルレポート

プロファイラのレポートは、プラグインキャッシュの動きと永続コンテンツキャッシュの動きを分けて示します。コンテンツキャッシュのヒット、ミス、バイパスに加え、各ミスの理由（例：`no-entry`、`dependency-changed`）と各バイパスの理由（例：l10nの安全なバイパス）を報告するため、エントリを再利用していないウォームビルドでも、キャッシュの内部を読まずに理由を説明できます。

### 診断の計測

プロファイラは `diagnostics.run` スパンの所要時間と、診断が検出したfindingsの件数を表示します。

- 合計（total）
- エラー（error）
- 警告（warning）
- 情報（info）

これにより、診断にどれだけ時間がかかり、同時にいくつの問題が報告されたかを確認できます。

```
diagnostics.run
├─ duration
├─ total
├─ error
├─ warning
└─ info
```

診断がビルド時間の大部分を占めている場合は、その段階をさらに調査する合図です。

### 例

```sh
# Collect trace and display performance report
riebeckite profile

# Without incremental reuse (full build path)
riebeckite profile --full
```
## 関連用語

- [[trace-span|Trace Span]]
- [[logger|Logger]]
- [[build|Build]]

## さらに詳しく

- [Observability](../framework/observability.ja.md)
