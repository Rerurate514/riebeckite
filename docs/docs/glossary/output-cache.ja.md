---
date: 2026-10-14
title: 出力キャッシュ（Output Cache）
sidebar:
  hidden: true
---

# 出力キャッシュ（Output Cache）

`.riebeckite/ssg-output-cache.json` にあるSSGの出力キャッシュです。描画済みの出力ルートとファイルを保存し、増分SSGで再利用します。CI実行間で復元されるためGitHub Actionsでも増分SSGが機能し、検査に通らないキャッシュは破棄されます。

## 目的

現在のマニフェストをビルドした後、Coreは出力記述子を前回成功した状態と比較します。HonoXは影響を受けるコンテンツとプラグインページのルートだけを描画し、変わっていない生成物は出力キャッシュから復元し、サイトが所有しなくなった出力は削除します。

## 出力一覧の比較

Coreは出力一覧を構築します（`.riebeckite/ssg-output-cache.json` には、パスをキーにしたすべての生成物の記録が入ります。コンテンツ出力、リダイレクト、プラグインページ出力、生成物を含みます）。現在の一覧を前回成功した状態と比較し、影響を受ける出力（再生成が必要）、変わらない出力（再利用できる）、削除された出力を判定します。ビルドログには `SSG outputs` の行で `rendered`、`reused`、`removed` の件数が出ます。

## 再利用の判定

Coreが変わっていない出力をキャッシュから復元するのは、次の条件がすべて満たされるときだけです。

- ビルド状態が有効で、出力の変更セットが利用できる。
- 変更セットが完全な再生成を要求していない。つまり、失敗した外部依存がなく、`unknown` 依存を持つ出力もない。
- 出力キャッシュが復元され、整合性検査（スキーマバージョン、エントリファイル、チェックサム）に通っている。
- アプリのフィンガープリントとクライアントマニフェストのフィンガープリントが、キャッシュの値と一致している。
- 変わっていない出力がすべて、サイト所有かキャッシュ内に存在する。

SSGのメトリクスは結果を `outputCacheDecision`（条件ごとの判定）と `outputCacheRejectionReason` に記録します。理由は、出力を再利用したときは `null`、それ以外は `change-set-unavailable`、`full-regeneration-required`、`output-cache-missing-or-invalid`、`app-fingerprint-changed`、`client-manifest-fingerprint-changed`、`unchanged-output-not-cached` のいずれかです。キャッシュを棄却したときは、同じメトリクスの `fullRegenerationRequired` が `true` になります。

この判定はCLIのno-changeファストパスとは別です。ファストパスでは、マニフェストフックや生成物プランを必要とするプラグインがないことも追加で求められます。

## 永続化

生成されるGitHub Actionsワークフローは、出力キャッシュ（`.riebeckite/ssg-output-cache.json`、その `.riebeckite/ssg-output-cache.entries` ディレクトリ、`.riebeckite/ssg-output-cache.fast-path.json` サイドカー）を、コンテンツキャッシュとビルド状態と一緒に復元します。これによりCIは実行間で描画済み出力を再利用できます。復元した状態が一致しなければRiebeckiteが検証してすべての出力を描画し直すため、転送しても安全です。完全な再生成を強制するには `.riebeckite/build/content-state.json` と `.riebeckite/ssg-output-cache.json` を削除します。ワークフローの詳細は[GitHub Actions](../guides/deployment/github-actions.ja.md)にあります。

## 関連用語

- [[ssg|SSG]]
- [[output-inventory|Output Inventory]]
- [[glossary/cache|Cache]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
