---
date: 2026-10-20
title: 開発診断アーキテクチャ
---
# 開発診断アーキテクチャ

## 対象範囲

Riebeckite Doctor と Development Inspector は `@riebeckite/diagnostics` を共有します。
このパッケージはシリアライズ可能なレポートモデルを所有し、Core がすでに提供している観測結果を、安定した順序の診断に変換します。コンテンツの解析、プラグイン実行、出力計画、設定解決、UI は所有しません。

Inspector は開発サーバー専用の読み取り専用オブザーバーです。コンテンツをビルドせず、`ContentManager` を再構築せず、プラグイン Hook を実行せず、ビルド状態を書き込まず、サイトの CSS を適用しません。

## 再利用する観測結果

| 関心事 | 既存の情報源 | Inspector での利用 |
| --- | --- | --- |
| コンテンツの整合性と WikiLink | 完了済み manifest の診断 | `inspect()` を再実行せず、ビルドが記録した診断を表示します。 |
| プラグインの順序と Capability | 解決済み設定と `resolvePlugins()` | 解決済みの順序に、設定されていた無効プラグインを加えて表示します。 |
| 出力の所有権 | `buildOutputPlan()` と `compareOutputPlan()` | SSG と同じ出力分類を維持します。 |
| 増分依存関係 | 完了済みの `OutputChangeSet` | affected / unchanged / removed の出力と、記録済みの依存関係を表示します。 |
| プラグイン実行 | `TraceSpan` と `TraceEvent` の記録 | 既存の Hook span を集計します。計測のために Hook を呼び直しません。 |
| テーマ | 解決済みテーマ設定 | 設定値とブラウザで観測した値を比較します。 |
| 開発サーバー | 既存の HonoX / Vite 統合 | 開発時だけ有効な Vite ミドルウェアとクライアント仮想モジュールを追加します。 |

## 完了済みビルドスナップショット

`ContentManager` のビルドが成功すると、不変の `CompletedContentBuildSnapshot` を 1 つ公開します。manifest、OutputChangeSet、完全再生成の理由、プラグイン一覧、manifest Hook の計測値、開発用 Trace を含みます。`completedAt` と `startedAt` は計測したビルド時間の範囲を表します。Inspector が読むコレクションは公開前に凍結または複製するため、後続のビルドが公開済みスナップショットを変更することはありません。

Inspector は Vite の SSR モジュールグラフからアプリケーションの既存 `content` export を見つけ、`getCompletedBuildSnapshot()` を呼び出します。`ContentManager` は構築しません。完了済みビルドが存在しない場合、report / output / graph / plugins の各エンドポイントは明示的な `unavailable` を返します。

コンテンツの編集、作成・削除、設定変更は Inspector のリビジョンを 1 つ進めます。Inspector は無効化した時刻を記録し、その時刻以降に完了したスナップショットだけを受け入れます。現在のリビジョンに完了済みビルドがまだない場合は、古い情報を最新として表示せず `unavailable` を返します。add / unlink イベントは 150 ms まとめるため、リネームは 1 リビジョン・1 回の検査になります。

## タブ

右ドックは Shadow DOM を使い、既存のタブを維持します。

- **Overview** は現在のページ、テーマ、リビジョンを表示します。
- **Diagnostics** は完了済み manifest の診断を検索・絞り込みします。
- **Dependencies** はビルド出力の依存グラフと既存の依存サマリーをまとめて表示します。
- **Plugins** はプラグインの解決順序と記録済み Hook 実行を表示します。
- **Output** は出力変更セット、パス検索、再生成理由、各出力からグラフへの導線を表示します。
- **Theme** は解決済みテーマ設定と、ブラウザで観測した CSS トークンを表示します。

## 依存グラフ

`/__riebeckite/inspector/graph` は完了済みの `OutputChangeSet`、`OutputPlan`、`OutputDependency` を情報源にします。WikiLink のコンテンツグラフではなく、ビルド出力の依存グラフです。コンテンツノードは `content:<slug>`、出力ノードは `output:<path>` で表し、その他の依存は `tag:`、`folder:`、`file:`、`public-location:`、`projection:`、`external:`、`content-query:`、`global`、`unknown` を使います。

エンドポイントは `node`、`q`、`kind`、`direction`（`both`、`in`、`out`）、`page`、`limit`（最大 100）を受け付けます。初期表示は出力のルートだけです。ノードを選ぶと、直接の入力・出力の隣接ノードだけを返し、Vault 全体は返しません。検索、絞り込み、ページングはサーバー側で行います。ノードの状態は `affected`、`unchanged`、`removed` で、affected の出力には記録済みの再生成理由が付きます。エッジは現在のページで表示するノード間のものだけを送ります。

## プラグイン実行

`/__riebeckite/inspector/plugins` は完了済みスナップショットに保存された Trace を読みます。各プラグインには解決順序、有効状態、Capability（`provides`、`requires`、`optional`）、記録された Hook 数、累積時間、失敗した Hook、診断数、キャッシュの hit / miss / bypass が含まれます。無効プラグインは設定済みプラグイン一覧から表示し、Hook 実行はありません。

Hook の行は `{ plugin, hook }` 属性を持つ span を集計します。実行されなかった Hook に行はありません。失敗した span があると、その集計は失敗として表示されます。ビルドに Trace 記録がない場合、時間は `not measured` と表示し、推測値は出しません。

プラグインの時間は span の合計です。並列またはネストした Hook は重なることがあるため、この合計は wall-clock time ではありません。コンテンツビルドの wall-clock は別に `completedAt - startedAt` で表示します。Trace ウィンドウは、記録された最も早い開始から最も遅い終了までです。

エンドポイントは `q`、`plugin`、`sort`（`duration` または `name`）、`page`、`limit`（最大 100）を受け付けます。計測は既存の span 呼び出し以上のことをせず、Inspector は集計以外の計測処理を行いません。

## テーマとスタイルの観測

レポートには解決済みのテーマ名、カラーモード、レイアウト、スタイル、スタイルシート、設定値、適用済み data 属性、生成された設定スタイルが含まれます。Theme タブはこの設定を期待値として使います。

`--rb-` または `--rr-` で始まる CSS トークンは、読み取り可能な `document.styleSheets` とルートのインラインスタイルから収集します。各トークンには `<html>` 上の computed value、設定値がある場合はその値、宣言している読み取り可能なスタイルシートを表示します。読み取れないクロスオリジンのスタイルシートは件数だけを表示し、推測しません。computed value がないトークンは `undefined`、設定値と異なるトークンは `mismatch` として表示します。所有元は、実際に読み取れたシートの URL または「inline stylesheet」以外には推定しません。

ルート属性またはシステムのカラーモードが変わると再描画します。あくまで観測のみを行い、サイト CSS とテーマ CSS の責務は変更せず、トークンやスタイルシートを編集しません。

## 出力の問い合わせと完全再生成の根拠

`/__riebeckite/inspector/output` はパラメーターなしのレスポンス形式を維持したまま、サーバー側のクエリーパラメーターを受け付けます。

- `page` と `limit`（最大 100）で affected / unchanged / removed の出力一覧をページングします。`status`、`kind`、`q` で絞り込みます。
- `output` は 1 つの出力パスから、記録済みの依存関係と関連出力を返します。`changed` はコンテンツ変更が直接影響する出力を一覧します。
- 一覧の各行には記録された原因を表示します。affected は変更された依存関係、unchanged は追跡対象の依存関係に変更がないこと、removed は現在のインベントリーに存在しないことを示します。
- `dpage`、`dlimit`、`dkind`、`dq` で依存関係の行をページング・絞り込みします。

エンドポイントは完了済みの変更セットを絞り込み、ページングします。全行を送信せず、クエリーごとに計画を再構築しません。

完全再生成の理由には、ビルド状態のステータス、`isPersistentlyCacheable`、パイプラインのフィンガープリント、出力変更セットに記録された理由という既存の Core の根拠を使います。既存の観測に原因を紐付けられない場合は、推測せず `unknown` として表示します。

## アクセスと本番の境界

すべての Inspector エンドポイントはループバックからのみ利用でき、`no-store` を返し、クエリーパラメーターを検証し、HonoX のキャッチオール開発ミドルウェアより前に登録されます。失敗時はファイルパスや設定値を含まない不透明なエラーコードを返します。

`@riebeckite/diagnostics` は Core に依存します。CLI はレポートを描画します。HonoX 統合は Vite が配信している間だけレポートと Inspector UI を提供します。本番用クライアントモジュールは Inspector を import せず、Inspector プラグインは `apply: "serve"` を使い、開発用 Trace モジュールは開発時専用のコンテンツランタイムだけが import します。

ランチャーは配信中のみ利用できます。編集可能なコントロールの外で Ctrl+Alt+R を押すと開閉し、Escape で閉じてランチャーにフォーカスを戻します。

## 既知の観測制約

Markdown / HTML のパイプラインでは要素からソースへの対応が保持されないため、Inspector は要素ピッカーや DOM から Markdown への対応を提供しません。出力計画とディスク上のファイルの比較も行いません。CSS の所有元は、ブラウザで実際に読み取れたスタイルシートの場合だけ表示します。要素単位の検査には、レンダラー境界での開発専用 source-map 観測が必要です。
