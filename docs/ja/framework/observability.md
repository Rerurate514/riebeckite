# Observability

Riebeckite は log、trace、profile を分け、それぞれ異なる問いに答えます。

| signal | 答える問い | 用途 |
| --- | --- | --- |
| Logger | 何が起きた・失敗したか | 安全な structured operational message |
| Tracer / `TraceSink` | どこでどれだけ作業したか | nested timed span |
| Profiler | build のどこを調査すべきか | trace を集計して報告 |

## Trace semantics

meaningful な build phase、plugin work、I/O boundary に span を作り、成功時も失敗時も閉じます。比較できる stable name を選び、trace を error の隠蔽に使わず実際の failure を caller contract に従って伝播します。

parallel work では child span duration の合計は cumulative work であり wall-clock time ではありません。Profiler はこの違いを保持して、並行処理を遅い直列処理のように表示しないでください。

## Safety and scope

secret、credential、不要に機微な source content を log しません。instrumentation は任意かつ結果を変えないものにし、Worker runtime が mutable trace/profile file に依存しないようにします。CLI では `riebeckite profile [--full]` を利用します。問題の調査時は [Build system](build-system.md) と [Diagnostics](diagnostics.md) と組み合わせてください。

profile レポートには diagnostics の phase も含まれます。`diagnostics.run` span の duration と、diagnostics 収集時に発行される total/error/warning/info の件数を表示します。diagnostic のコストと量を、それを生んだ build phase の隣で確認できます。
