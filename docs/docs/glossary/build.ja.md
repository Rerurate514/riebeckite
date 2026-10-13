---
title: ビルド
sidebar:
  hidden: true
---

# ビルド

Riebeckite がコンテンツを処理し、場所を解決し、プラグインを実行し、マニフェストとグラフを構築して出力を書き込むプロセスです。

## Build の流れ

1. 設定とプラグインを解決する
2. Markdown などのコンテンツを読み込む
3. プラグイン変換を実行する
4. 公開するページとリンクを決定する
5. サイト全体の情報と必要なアセットを収集する
6. 画像やブラウザ側のコードなどのアセットをエミットする
7. HonoX で Web サイトをビルドする

## フルビルドとインクリメンタルビルド

`--full` を使って以前のビルド情報を使わずにすべてを処理する。
インクリメンタルビルドは前回のビルド結果を再利用し、変更されたものだけを処理する。
前回のビルド情報は `.riebeckite/build/content-state.json` に保存されている。

## Build State

Build state は `.riebeckite/build/content-state.json` のアプリケーションスコープで保存される。
これは最適化であり、正本ではない。欠落・非互換・不安全な状態の場合は initial/full パスが取られる。
状態は Build 成功後にのみ保存されるため、失敗しても以前の有効な状態が保持される。

## 関連用語

- [[incremental-build|インクリメンタルビルド]]
- [[build-state|ビルド状態]]
- [[cache-invalidation|キャッシュ無効化]]
- [[fingerprint|フィンガープリント]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
