# Observability

Riebeckite separates logs, traces, and profiling so each answers a different question.

| Signal | Answers | Contract |
| --- | --- | --- |
| Logger | What happened or failed? | structured, safe operational messages |
| Tracer / `TraceSink` | Where did work occur and how long did it take? | nested timed spans |
| Profiler | Where should build performance be investigated? | consumes trace data and reports it |

## Trace semantics

Create spans around meaningful build phases, plugin work, and I/O boundaries; close them on both success and failure. Trace names should be stable enough for comparison. Do not use traces to hide errors: record/propagate the actual failure according to the caller contract.

For parallel work, the sum of child span durations is cumulative work, not elapsed wall-clock time. A profiler must label or otherwise preserve that distinction so concurrent activity is not misreported as a slow serial path.

## Safety and scope

Do not log secrets, raw credentials, or unnecessarily sensitive source content. Keep tracing optional and proportional: instrumentation must not alter build results. Runtime Workers must not depend on mutable build traces or local profiling files.

Run `riebeckite profile [--full]` for CLI-driven reporting. Pair it with [Build system](build-system.md) and [Diagnostics](diagnostics.md) when investigating a problem.
