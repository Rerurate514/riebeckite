# @riebeckite/diagnostics

Shared, serializable development diagnostics for Riebeckite tooling.

[日本語](./README_ja.md)

`collectDevelopmentDiagnostics` reuses Core inspection and output planning to produce a deterministic report for the CLI Doctor and development Inspector. It is read-only and does not trigger a build.

Pass `includeOutput: false` to collect diagnostics without the output plan, and use `diagnoseOutputPlan` to turn an output plan into output diagnostics. The development Inspector uses both to serve diagnostics before the heavier output report.
