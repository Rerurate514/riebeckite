# Diagnostics

Diagnostics は Core、plugin、tooling が出す structured finding です。config、content、capability、environment の問題を、単なる console string ではなく実行可能な情報として伝えます。

## Producers and consumers

Plugin は `addDiagnostics` で finding を提供できます。Core/integration は `check` や `doctor` のために集約します。actionable な条件を名指しし、可能なら対象 content/config を特定し、output correctness に応じた severity と具体的な remediation を示してください。

`check` は config/plugin validity、`doctor` はより広い health を扱います。Doctor は一部の失敗で他の独立 finding を隠しません。失敗した health check は non-zero exit になります。

Doctor の build-state 検査は、incremental state が読めること、および保存された fingerprint が現在の content source と一致することを確認します。前回の build 以降に entry が追加・変更・削除されている場合は、件数と sample を含む warning として報告します。次の build で state は更新されます。

## コンテンツ ID の整合性

安定コンテンツ ID は、フロントマターの任意フィールド `id` から取得します（従来コンテンツ用に `uid` も受け付けます）。analytics プラグインのページビュー計測など、コンテンツ単位の利用者にとっての識別キーです。diagnostics プラグインはこの ID にまつわるコンテンツレベルの不変条件を 2 つ検査します。

| コード | 既定の重要度 | 対象 |
| --- | --- | --- |
| `duplicate-content-id` | error | 複数の公開ノートが同じ安定コンテンツ ID を共有している。コンテンツ単位の指標が黙って合算される |
| `invalid-content-id` | error | `id`/`uid` のフロントマターが安定コンテンツ ID の契約を満たしていない（例: `id` と `uid` が抵触）。ビルドが失敗する |

いずれも汎用のコンテンツ診断であり、diagnostics プラグインは analytics 固有の要求をチェック抽象化に hardcode しません。

## Authoring rules

- option validation は pure にし、file read・mutation・background work を始めない
- 不確実なら unsafe output を黙って選ばず報告する
- stack trace、token、不要な絶対 path を user-facing message に漏らさない
- stable identifier と remediation を優先し、text matching に依存しない
- diagnostic から auto-fix/build/cache/state mutation をしない

事実の閲覧は [Inspector](inspector.md)、log/trace は [Observability](observability.md) を参照してください。
