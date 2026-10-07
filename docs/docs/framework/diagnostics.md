# Diagnostics

Diagnostics are structured findings emitted by Core, plugins, and tooling. They make invalid configuration, content issues, capability problems, and environmental health visible without turning every issue into an unstructured console string.

Instead of printing a message to the console, a diagnostic describes:

- what the problem is
- where it occurs
- how important it is
- how to fix it

Core and plugins express problems in this shared form so that `check` and `doctor` can report them together.

## Producers and consumers

Plugins can provide diagnostics through `addDiagnostics`; Core and integrations combine them for commands such as `check` and `doctor`. A plugin should name the actionable condition, identify the relevant content/configuration when available, and make severity proportionate to whether output can remain correct. Prefer a diagnostic that says which setting is invalid and how to change it over one that only reports "invalid configuration".

Use `check` for configuration/plugin validity and `doctor` for broader health. Doctor checks independent areas where possible, so one broken optional area should not conceal another finding. A failing doctor result exits unsuccessfully.

The doctor build-state check verifies that the incremental state is readable and that its stored fingerprints still match the current content source. When entries were added, changed, or removed since the last build, it reports a warning with counts and samples; the next build refreshes the state.

## Content ID integrity

Stable content IDs come from the optional source-authored `id` frontmatter field and are the identity key for per-content consumers such as the analytics plugin's page-view tracking.

```yaml
---
id: my-article
---
```

This ID identifies the content itself, separately from its URL. The diagnostics plugin reports two content-level invariants around them:

| Code | Default severity | Condition |
| --- | --- | --- |
| `duplicate-content-id` | `error` | multiple published notes share a stable content ID, which would silently merge per-content metrics |
| `invalid-content-id` | `error` | `id` frontmatter violates the stable content ID contract, which breaks the build |

These checks are generic content diagnostics; the diagnostics plugin does not hardcode an analytics-specific requirement into its check abstraction. If two articles share the same ID, for example, analytics can treat their data as one piece of content. The check is a shared integrity rule for every feature that uses content IDs, not an analytics-only check.

## Site-wide content integrity

The diagnostics plugin also reports manifest-level reference integrity for the published site. It checks resolved public entries and plugin-provided public routes rather than creating a parallel filesystem scanner. It detects problems such as:

- links to pages that do not exist
- WikiLinks that cannot be resolved
- references to images or attachments that do not exist
- duplicate final public locations
- redirects to a target that does not exist
- redirect cycles

These are reported as `content-integrity:*` diagnostics.

### Which information the checks use

Integrity checks use the public content and public paths that Riebeckite has already resolved. They do not parse the Markdown again or re-read content just for diagnostics. The checks are also based on the resolved result, so when permalinks, aliases, renames, localization, and publish/exclude settings change the final public location, the checks follow Riebeckite's resolution.

### Difference from HTML quality checks

Diagnostics own site-wide reference and structure integrity. Per-page HTML quality, such as whether an image has an appropriate `alt` attribute, whether the heading structure is correct, or whether the generated HTML has problems, remains the responsibility of `@riebeckite/plugin-quality`.

## Publishing pages and assets from a plugin

When a plugin publishes its own pages, generated files, or assets, register them through the corresponding Riebeckite mechanism. Correctly registered public targets are recognized by diagnostics too. If a plugin officially publishes a page at `/explore`, for example, a link to

```text
/explore
```

is not reported as a missing page.

## Authoring rules

- Validate options with a pure validator; do not read files, mutate state, or start work while validating.
- Report uncertainty rather than silently choosing unsafe output.
- Do not leak internal stack traces, tokens, or absolute local details into user-facing messages.
- Prefer stable identifiers and clear remediation over brittle text matching.
- Keep diagnostics read-only; they must not auto-fix, build, or mutate cache/state.

Diagnostics are a mechanism for **finding and explaining** problems, not for fixing them automatically or changing build state. Use [Inspector](./inspector.md) to inspect facts and [Observability](./observability.md) for logs and traces.
