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

The profile report separates plugin-cache activity from persistent-content-cache activity. It reports content-cache hits, misses, and bypasses together with the reason for each miss (for example `no-entry` or `dependency-changed`) and each bypass (for example an l10n safe bypass), so a warm build that is not reusing entries can be explained without reading cache internals.

## Safety and scope

Do not log secrets, raw credentials, or unnecessarily sensitive source content. Keep tracing optional and proportional: instrumentation must not alter build results. Runtime Workers must not depend on mutable build traces or local profiling files.

Run `riebeckite profile [--full]` for CLI-driven reporting. Pair it with [Build system](build-system.en.md) and [Diagnostics](diagnostics.en.md) when investigating a problem.

The profile report includes the diagnostics phase: the duration of the `diagnostics.run` span and the total, error, warning, and info counts emitted when diagnostics are collected. This keeps diagnostic cost and volume visible next to the build phases that produced them.
