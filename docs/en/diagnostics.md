# Diagnostics

Diagnostics are structured findings emitted by Core, plugins, and tooling. They make invalid configuration, content issues, capability problems, and environmental health visible without turning every issue into an unstructured console string.

## Producers and consumers

Plugins can provide diagnostics through `addDiagnostics`; Core and integrations combine them for commands such as `check` and `doctor`. A plugin should name the actionable condition, identify the relevant content/configuration when available, and make severity proportionate to whether output can remain correct.

Use `check` for configuration/plugin validity and `doctor` for broader health. Doctor checks independent areas where possible, so one broken optional area should not conceal another finding. A failing doctor result exits unsuccessfully.

The doctor build-state check verifies that the incremental state is readable and that its stored fingerprints still match the current content source. When entries were added, changed, or removed since the last build, it reports a warning with counts and samples; the next build refreshes the state.

## Content ID integrity

Stable content IDs come from the optional source-authored `id` frontmatter field (`uid` is accepted for legacy content) and are the identity key for per-content consumers such as the analytics plugin's page-view tracking. The diagnostics plugin reports two content-level invariants around them:

| Code | Default severity | Condition |
| --- | --- | --- |
| `duplicate-content-id` | `error` | multiple published notes share a stable content ID, which would silently merge per-content metrics |
| `invalid-content-id` | `error` | `id`/`uid` frontmatter violates the stable content ID contract (for example `id` and `uid` conflict), which breaks the build |

These checks are generic content diagnostics; the diagnostics plugin does not hardcode an analytics-specific requirement into its check abstraction.

## Authoring rules

- Validate options with a pure validator; do not read files, mutate state, or start work while validating.
- Report uncertainty rather than silently choosing unsafe output.
- Do not leak internal stack traces, tokens, or absolute local details into user-facing messages.
- Prefer stable identifiers and clear remediation over brittle text matching.
- Keep diagnostics read-only; they must not auto-fix, build, or mutate cache/state.

Use [Inspector](inspector.md) to inspect facts and [Observability](observability.md) for logs and traces.
