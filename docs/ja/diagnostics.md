# Diagnostics

Diagnostics は Core、plugin、tooling が出す structured finding です。config、content、capability、environment の問題を、単なる console string ではなく実行可能な情報として伝えます。

Plugin は `addDiagnostics` で finding を提供できます。Core/integration は `check` や `doctor` のために集約します。可能なら対象 content/config を特定し、output correctness に応じた severity と具体的な remediation を示してください。

`check` は config/plugin validity、`doctor` はより広い health を扱います。Doctor は一部の失敗で他の独立 finding を隠しません。失敗した health check は non-zero exit になります。

- option validation は pure にし、file read・mutation・background work を始めない
- 不確実なら unsafe output を黙って選ばず報告する
- stack trace、token、不要な絶対 path を user-facing message に漏らさない
- stable identifier と remediation を優先し、text matching に依存しない
- diagnostic から auto-fix/build/cache/state mutation をしない

事実の閲覧は [Inspector](inspector.md)、log/trace は [Observability](observability.md) を参照してください。
