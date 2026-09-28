# Diagnostics

Diagnostics are structured findings emitted by Core, plugins, and tooling. They make invalid configuration, content issues, capability problems, and environmental health visible without turning every issue into an unstructured console string.

## Producers and consumers

Plugins can provide diagnostics through `addDiagnostics`; Core and integrations combine them for commands such as `check` and `doctor`. A plugin should name the actionable condition, identify the relevant content/configuration when available, and make severity proportionate to whether output can remain correct.

Use `check` for configuration/plugin validity and `doctor` for broader health. Doctor checks independent areas where possible, so one broken optional area should not conceal another finding. A failing doctor result exits unsuccessfully.

## Authoring rules

- Validate options with a pure validator; do not read files, mutate state, or start work while validating.
- Report uncertainty rather than silently choosing unsafe output.
- Do not leak internal stack traces, tokens, or absolute local details into user-facing messages.
- Prefer stable identifiers and clear remediation over brittle text matching.
- Keep diagnostics read-only; they must not auto-fix, build, or mutate cache/state.

Use [Inspector](inspector.md) to inspect facts and [Observability](observability.md) for logs and traces.
