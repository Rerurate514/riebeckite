# @riebeckite/diagnostics

Shared, serializable development diagnostics for Riebeckite tooling.

[日本語](./README_ja.md)

`collectDevelopmentDiagnostics` reuses Core inspection and output planning to produce a deterministic report for the CLI Doctor and development Inspector. It is read-only and does not trigger a build.

Pass `includeOutput: false` to collect diagnostics without the output plan, and use `diagnoseOutputPlan` to turn an output plan into output diagnostics. The development Inspector uses both to serve diagnostics before the heavier output report.

Every newly collected finding has a stable `rb-` fingerprint derived from its category, code, subject, plugin, and location. The additive report summary also includes unavailable and skipped counts plus counts by category and code. Use `filterDevelopmentDiagnostics` for code or severity views without changing the original report.
