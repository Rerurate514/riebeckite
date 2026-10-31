---
date: 2026-10-08
title: ビルド来歴
sidebar:
  label: ビルド来歴
  order: 10
---
# ビルド来歴

## 来歴の記録

正常に完了したビルドでは、バージョン付きの来歴スナップショットも[[glossary/build-state|ビルド状態]]に保存します。来歴は、既存の [[content-graph|Content Graph]]、[[glossary/output-dependency|出力依存関係]]、出力変更理由、実行時の計測値を利用して作ります。別の依存関係グラフは作りません。記録する内容は次のとおりです。

- 相対パスと[[glossary/fingerprint|フィンガープリント]]
- コンテンツ処理
- 計測済みのプラグインフックの順序と時間
- [[derived-data|Derived View]] のキャッシュ状態
- 生成・再利用・削除された出力記述子

既存の依存関係記録で関係を証明できないフックの効果は、不透明なままです。キャッシュヒットは実行ではなく再利用として表示します。

[[honox-integration|HonoX]] による [[glossary/ssg|SSG]] が完了すると、最終出力の実バイト列から算出した SHA-256 フィンガープリントも追加します。Core の出力記述子に対応しない成果物は、明示的に `unmapped` とします。Core だけのビルドでは、最終バイト列を記録したとは扱いません。

来歴は観測用です。状態が無効だったり、欠けていたり、書き込めなかったりしても、出力の生成には影響しません。その場合は通常のビルドへフォールバックします。Markdown 本文、絶対パス、設定内の秘密情報は保存しません。

記録の根拠は `measured`、`deterministic`、`unobservable` で区別します。[[framework/derived-data|Derived View]] のキャッシュヒットは再利用として扱います。実行されたフックは、既存の依存関係データで入出力が証明されない限り `opaque` のままです。[[framework/inspector|Inspector]] は保存済みスナップショットと private エンドポイントだけを読み取ります。コンテンツの再ビルド、Derived View の解決、ビルド状態の変更は行いません。

直近 10 件のスナップショットを保存し、比較できます。`riebeckite inspect provenance` で要約を確認し、`riebeckite inspect provenance --json` で保存済みの機械可読な記録を出力します。`--source <relative-path>` と `--output <path>` は最新のスナップショットを絞り込みます。`--compare <build-id>` を付けると、保存済みのスナップショットとの差分も出力します。指定した build id が履歴にない場合は、比較できないことを JSON に明示します。

開発 Inspector の Provenance タブと `/__riebeckite/inspector/provenance` エンドポイントは、認証済みの private inspector server 経由で、最新の読み取り専用スナップショットを公開します。記録を省略するには `provenance: { enabled: false }` を設定します。

### 来歴計測のコスト

`scripts/benchmark_large_vault.mjs` は `RIEBECKITE_BENCH_PROVENANCE=off|on` を受け付け、複数回実行した wall-clock 時間の中央値を出力します。測定条件は、1,000 ノートの Vault、Windows (win32)、Node v24.22.0、シナリオごとに 5 回、既定のコンテンツキャッシュと[[glossary/output-cache|出力キャッシュ]]を有効にした状態です。結果は次のとおりでした。

| シナリオ | 来歴 off（中央値、最小–最大） | 来歴 on（中央値、最小–最大） |
| --- | --- | --- |
| コールドビルド | 2,358 ms（2,306–3,119） | 2,422 ms（2,383–2,596） |
| 変更なしのウォームビルド | 584 ms（531–933） | 747 ms（627–2,251） |
| 独立したノート1件の編集 | 646 ms（585–670） | 741 ms（680–1,035） |

この値は今回のマシンとコンテンツ構成での結果であり、性能を保証するものではありません。来歴の記録は、Manifest と出力計画が確定した後に発生する観測コストです。無効にすると、記録・履歴・状態のシリアライズだけが省略され、ビルド出力は変わりません。

## ビルドの流れ

ビルドを実行すると、Riebeckite はまず設定と使用する[[glossary/plugin|プラグイン]]を読み込みます。

次に、[[glossary/content-source|コンテンツソース]]から Markdown などのコンテンツを読み込み、設定されたプラグインによる変換を行います。

この段階では、Markdown を HTML に変換するだけでなく、次の情報も決定します。

- どのコンテンツを公開するか
- 各ページをどの URL で公開するか
- ページ同士がどのようにリンクしているか
- どの画像やファイルが必要か
- プラグインが追加するページやファイル

これらの情報をもとに、サイト全体のページ情報、リンク関係、必要なアセットを生成します。

最後に HonoX が、生成された情報を使って Web サイト全体をビルドします。
