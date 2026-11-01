---
date: 2026-10-08
title: データ来歴
sidebar:
  label: データ来歴
  order: 10
---
# データ来歴

データ来歴システムは、ビルドの入力、変換、出力がどこから来たかを記録します。
これは観測用のデータであり、生成されるファイルを変えることはありません。記録が
欠けていても壊れていても、ビルドは失敗しません。「どのソースがこの出力を作ったか」
「2 つのビルドの間で何が変わったか」を調べるために使います。

## はじめかた

来歴は既定で有効です。ビルドを実行し、最新の記録を確認します。

```sh
pnpm exec riebeckite build
pnpm exec riebeckite inspect provenance
```

報告を絞り込む場合や、保存済みのビルドと比較する場合は次のようにします。

```sh
pnpm exec riebeckite inspect provenance --source notes/hello.md
pnpm exec riebeckite inspect provenance --output blog/hello/index.html
pnpm exec riebeckite inspect provenance --json
pnpm exec riebeckite inspect provenance --compare <build-id>
```

専用のデータベースやサービスはありません。記録は既存のビルド状態に保存され、
Inspector が読み取ります。

## 設定

```ts
export default defineConfig({
  provenance: {
    enabled: false,
  },
});
```

`enabled` の既定値は `true` です。`false` にすると、記録、履歴、比較データ、
Inspector の来歴データをすべて省略します。ビルド出力は変わりません。

## ビルドが所有するもの

明示的なビルドは、設定とプラグインを解決し、コンテンツを読み、コンテンツと
プラグインのパイプラインを実行し、マニフェストと Content Graph を作り、登録済みの
アセットとクライアントエントリを出力し、成功した増分状態を記録します。その後、
HonoX 統合が生成済みエントリを使ってアプリケーションをビルドします。

[[glossary/build-state|ビルド状態]]はアプリケーション単位で
`.riebeckite/build/content-state.json` に保存されます。これは最適化であり、
正しさの源ではありません。状態が欠けている、互換性がない、安全に再利用できない
場合は、初期化またはフルパスを通ります。`--full` はそのパスを明示的に要求します。
状態は成功したビルドの後だけ保存されるため、失敗時は以前の有効な状態が残ります。

## 来歴の記録

正常に完了したビルドでは、バージョン付きの来歴スナップショットも[[glossary/build-state|ビルド状態]]に保存します。来歴は、既存の [[glossary/content-graph|Content Graph]]、[[glossary/output-dependency|出力依存関係]]、出力変更理由、実行時の計測値を利用して作ります。別の依存関係グラフは作りません。記録する内容は次のとおりです。

- 相対パスと[[glossary/fingerprint|フィンガープリント]]
- コンテンツ処理
- 計測済みのプラグインフックの順序と時間
- [[derived-data|Derived View]] のキャッシュ状態
- 生成・再利用・削除された出力記述子

既存の依存関係記録で関係を証明できないフックの効果は、不透明なままです。キャッシュヒットは実行ではなく再利用として表示します。

[[honox-integration|HonoX]] による [[glossary/ssg|SSG]] が完了すると、最終出力の実バイト列から算出した SHA-256 フィンガープリントも追加します。Core の出力記述子に対応しない成果物は、明示的に `unmapped` とします。Core だけのビルドでは、最終バイト列を記録したとは扱いません。

来歴は観測用です。状態が無効だったり、欠けていたり、書き込めなかったりしても、出力の生成には影響しません。その場合は通常のビルドへフォールバックします。Markdown 本文、絶対パス、設定内の秘密情報は保存しません。

記録の根拠は `measured`、`deterministic`、`unobservable` で区別します。[[framework/derived-data|Derived View]] のキャッシュヒットは再利用として扱います。実行されたフックは、既存の依存関係データで入出力が証明されない限り `opaque` のままです。[[framework/inspector|Inspector]] は保存済みスナップショットと private エンドポイントだけを読み取ります。コンテンツの再ビルド、Derived View の解決、ビルド状態の変更は行いません。

## API リファレンス

公開 API は `@riebeckite/core` からエクスポートされます。独自のビルド統合から
利用できますが、通常の CLI 経路では自動的に呼ばれます。

```ts
import {
  appendProvenanceHistory,
  attachProvenanceArtifacts,
  compareBuildProvenance,
  createBuildProvenance,
  MAX_PROVENANCE_HISTORY,
  PROVENANCE_VERSION,
} from "@riebeckite/core";
```

```ts
createBuildProvenance(input: {
  plan: ContentBuildPlan;
  manifest: ContentManifest;
  outputChanges: OutputChangeSet;
  pluginHooks: readonly PluginHookExecution[];
  derivedViews: readonly DerivedViewInspection[];
  processed: ReadonlyMap<string, number>;
}): BuildProvenance
```

`createBuildProvenance` は、現在の計画、マニフェスト、出力変更、計測済みの
プラグインフック、Derived View の検査結果、コンテンツ処理時間から
`BuildProvenance` を作ります。コンテンツを読み直したり、2 つ目の依存関係グラフを
計算したりはしません。

```ts
compareBuildProvenance(
  from: BuildProvenance,
  to: BuildProvenance,
): BuildProvenanceComparison
```

比較結果には、ソース、変換、出力、成果物ごとの `added`、`removed`、`changed` の
ID が入ります。保持されていない build ID は再構成しません。Inspector は比較
できないことを明示します。

```ts
attachProvenanceArtifacts(
  provenance: BuildProvenance,
  input: {
    fingerprints: Readonly<Record<string, string>>;
    cacheHits: ReadonlySet<string>;
  },
): BuildProvenance
```

`attachProvenanceArtifacts` は [[honox-integration|HonoX]] の SSG 後に、最終出力の
バイト列のフィンガープリントとキャッシュ状態を追加します。Core の出力記述子に
対応しない成果物は `unmapped` になります。

```ts
appendProvenanceHistory(
  previous: readonly BuildProvenance[],
  provenance: BuildProvenance,
): readonly BuildProvenance[]
```

結果は最新の記録と、最大 `MAX_PROVENANCE_HISTORY`（10）件の履歴を保持します。
`PROVENANCE_VERSION` は各記録に保存されるスキーマバージョンです。

記録の型は `BuildProvenance`、`ProvenanceSource`、`ProvenanceTransform`、
`ProvenanceOutput`、`ProvenanceArtifact`、`BuildProvenanceComparison` です。
主なフィールドは次のとおりです。

| 型 | フィールド |
| --- | --- |
| `BuildProvenance` | `version`、`buildId`、`sources`、`transforms`、`outputs`、任意の `artifacts` |
| `ProvenanceSource` | `id`、`contentId`、`path`、`fingerprint`、`type`、`visibility`、`evidence` |
| `ProvenanceTransform` | `id`、`type`、`producer`、`inputs`、`outputs`、`status`、`evidence`、任意の `sequence`、`hook`、`effect`、`durationMs` |
| `ProvenanceOutput` | `id`、`path`、`kind`、`producer`、`dependencies`、`status`、`evidence`、任意の `recomputeReason` |
| `ProvenanceArtifact` | `id`、`path`、`fingerprint`、`descriptor`、`cache`、`evidence` |

## 保存と保持

最新の記録と履歴は `.riebeckite/build/content-state.json` の `provenance` と
`provenanceHistory` フィールドに保存されます。ビルド状態は成功したビルドの後だけ
書き込まれるため、失敗したビルドが以前の記録を置き換えることはありません。

来歴は意図的に独立した成果物にしていません。

- コンテンツ本文、絶対パス、環境変数の値、秘密情報を含みません。
- ビルド時の状態であり、`dist/` へコピーされません。
- 最新 10 件だけを保持し、それより古い比較対象は利用できなくなります。
- `.riebeckite/build/content-state.json` を削除すると来歴も消え、次のビルドは
  以前の記録なしで実行されます。
- Inspector のエンドポイントは loopback 専用で、セッションごとのトークンを
  要求します。loopback 以外の binding、host、origin、peer、forwarder 経由の
  リクエストは拒否されます。

## 統合

- [[derived-data|派生データ]]は `DerivedViewInspection` を提供します。キャッシュ
  ヒットは `reused` として記録され、`executed` にはなりません。子 View の
  バージョンが変わると、依存関係のフィンガープリントが変わります。
- [[build-system|ビルドシステム]]は、来歴が読む計画、出力変更セット、ビルド状態、
  増分再利用の判断を所有します。
- [[content-system|コンテンツシステム]]はソースパス、フィンガープリント、公開
  状態を提供します。
- [[honox-integration|HonoX]] は SSG 後に最終出力のバイト列フィンガープリントと
  キャッシュヒットを提供します。
- [[publication-workflow|公開ワークフロー]]はデプロイ判断に独自の公開
  フィンガープリントを使います。来歴は診断情報であり、承認やデプロイのゲートに
  使ってはいけません。
- [[reference/cli|CLI]] は `inspect provenance` を公開し、
  [[framework/inspector|Inspector]] は開発時に同じ記録を表示します。

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

## エラー処理

来歴はフェイルオープンです。

- 記録中に例外が起きると、Core は警告を出して来歴なしでビルドを続けます。
- 保存された記録が壊れている、未対応のバージョンである、期待した形と一致しない
  場合、ビルド状態は利用不可として扱われ、次のビルドは通常のフルパスを通ります。
- 状態を書き込めなくてもビルドは完了し、以前の有効な状態が残ります。
- `inspect provenance` は、有効な状態や記録がない場合に理由付きで `unavailable`
  を返します。状態を作ったりビルドを実行したりはしません。
- 保持されていない build ID を `--compare` に渡すと、比較を作らず JSON に
  `comparisonUnavailable` を返します。

## セキュリティと信頼境界

来歴は信頼されたビルドコードが出力する診断情報です。セキュリティ制御ではなく、
コンテンツを公開してよいかの判断に使ってはいけません。

- ソースパスは相対パスに正規化されます。ワークスペースの絶対パスは記録しません。
- コンテンツ本文、レンダリング済み HTML、設定の秘密情報、環境変数の値、
  認証情報は記録しません。
- プラグインフックは、既存の依存関係記録が入出力を証明しない限り `opaque` の
  効果として報告されます。任意のプラグインコードを内部調査することはありません。
- 開発用 Inspector のエンドポイントは loopback 専用で、セッションごとのトークンを
  要求します。来歴は本番出力に含まれません。
- 来歴にはファイル名とビルド構造が含まれ得ます。
  `.riebeckite/build/content-state.json` は非公開のビルド状態として扱ってください。

## 制約

- 来歴が説明できるのは成功したビルドです。完了しなかったビルドは説明できません。
- 履歴は 10 件までです。それより古い比較は利用できません。
- 依存関係グラフで証明できないフックの効果は `opaque` のままです。
- Core だけのビルドでは最終出力のバイト列フィンガープリントを記録しません。
  成果物は [[honox-integration|HonoX]] の SSG 後に追加されます。
- 来歴は公開計画、承認ゲート、成果物の検証を置き換えません。
- キャッシュヒットは値が再利用されたことを意味します。生成コードが今回のビルドで
  実行された証拠ではありません。

## トラブルシューティング

- **`inspect provenance` が「no valid build state」を返す**: 先にビルドを成功させて
  ください。Inspector はビルドしません。
- **「provenance was not recorded」**: 状態はありますが、このビルドが
  `provenance.enabled: false` で実行されたか、記録に失敗しています。ビルドの
  警告を確認してください。
- **特定のソースや出力が表示されない**: `--source` と `--output` は、渡した
  相対パスと完全一致するものだけを絞り込みます。
- **比較が利用できない**: `--compare` の build ID が保持されている 10 件より古いか、
  ビルド状態が削除されています。
- **プラグインフックが `opaque` に見える**: 出力依存関係が関係を証明していなければ
  想定どおりです。時間から依存関係を推測しないでください。
- **失敗したビルドの後に来歴が古く見える**: 状態は成功時だけ置き換わります。
  最後に成功した記録が意図的に残っています。

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
