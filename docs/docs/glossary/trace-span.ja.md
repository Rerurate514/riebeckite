---
title: トレーススパン
sidebar:
  hidden: true
---

# トレーススパン

 build work の timed unit。traces は build work を span に分割し、その duration を記録する。span 名は安定しているべき (例: `content.load`, `plugins.run`, `diagnostics.run`, `application.build`) 。

## 構造

 trace には親 span (例: `build`) と、各ユニットの work 用の child span がある。
 成功でも失敗でも常に span を閉じる。

## 命名規約

 build 間で比較できる安定した span 名を使用する。
 入力ファイル名によって毎回変わる名前は避ける。

## 関連用語

- [[profiler|Profiler]]
- [[logger|Logger]]
- [[build|ビルド]]

## さらに詳しく

- [Observability](../framework/observability.ja.md)
