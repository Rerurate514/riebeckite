# Riebeckite Agent Documentation

This directory is the implementation guide for coding agents and automated maintainers. It is intentionally English-only, concise, and rule-oriented. Human-facing explanations, examples, and onboarding guidance live in [Japanese](../ja/README.md) and [English](../en/README.md).

Read the documents that match the change before editing. These rules supplement, rather than replace, the repository's local instructions and existing code patterns.

## Required reading by change type

|Change|Read|
|---|---|
|Any cross-package or ownership change|[Architecture Rules](./architecture.md)|
|Plugin contract, lifecycle, content processing, assets, endpoint, or cache change|[Plugin System Rules](./plugin-system.md)|
|Theme CSS, tokens, markup hooks, or presentation change|[Theme System Rules](./theme-system.md)|
|Build state, cache, CLI, diagnostics, profiler, tracer, doctor, or inspector change|[Build and CLI Rules](./build-and-cli.md)|

When a task spans categories, read every corresponding document. For public API behavior, configuration, or user-facing commands, also consult the matching human documentation under `../en/` or `../ja/` so implementation and documentation remain aligned.

## Repository map and ownership

```text
packages/
  core/                 portable framework contracts and orchestration
  plugins/*/            reusable content, HTML, and browser extensions
  integrations/*/       framework, bundler, and platform bridges
  themes/*/             presentation-only packages
  cli/                  Node.js build-time tooling
apps/
  web/                  concrete application: routes, islands, site UI
docs/
  agents/               this rule-oriented guide
  en/, ja/              human-facing documentation
```

The intended dependency direction is:

```text
App → Integration → Core
Plugin → Core contracts
Theme → Core theme contract
CLI → Core + Integration where required
```

Do not introduce a reverse dependency from Core to HonoX, Vite, a specific Plugin, Theme, or CLI. Keep site-specific behavior in `apps/web`, and keep HonoX/Vite behavior in `packages/integrations/*`.

## Global invariants

- Preserve the Core / Plugin / Integration / Theme / App / CLI responsibility boundaries.
- `ContentSource` owns scan, read, and source metadata. `ContentManager` owns interpretation, pipelines, manifest, graph, public-location resolution, and Plugin orchestration. Do not add direct filesystem scanning where the `ContentSource` contract applies.
- Public content URLs come from the resolved `ContentPublicLocation`: `resolveDefaultContentLocation` provides Core's default, Plugins may extend it through `resolveContentLocations`, and consumers/routing read the resolved `permalink`. Never build a public content URL from a slug or filesystem path; `slug` is an internal lookup key and `permalink` is the public URL.
- Keep build-time state (`.riebeckite/build`) and filesystem Plugin Cache out of Cloudflare Workers request runtime.
- Reuse an existing framework contract when it represents the needed boundary; do not create an abstraction solely for a hypothetical future use.
- Keep Inspector and Doctor read-only. `check` validates configuration and Plugin resolution; `doctor` reports health diagnostics; `inspect` reports factual state; `profile` reports trace-based performance; `build` is the mutating build path. Do not merge these semantics.
- Keep Plugin Cache regenerable, plugin-scoped, and distinct from Build State.
- Prefer structured diagnostics and tracing to parsing console text.
- For NodeNext/ESM, ensure runtime imports resolve after compilation without relying on `tsx`.
- Do not interpret cumulative duration from parallel work as wall-clock duration.
- Avoid unrelated refactors in a focused change. Preserve uncommitted user work.

## Implementation workflow

1. Locate the owning package and read its nearby conventions and relevant agent guide above.
2. Trace the existing contract and at least one comparable implementation before changing behavior.
3. Make the smallest change that preserves the ownership and runtime boundaries.
4. Update the applicable human documentation when configuration, CLI behavior, public contracts, or user-observable behavior changes.
5. Run the narrowest relevant checks, then inspect the final diff for unintended cross-package effects.

## Useful human references

|Subject|Reference|
|---|---|
|Content sources, manifest, graph, and publication|[Content System](../en/content-system.md)|
|Plugin API and lifecycle|[Plugin System](../en/plugin-system.md)|
|Theme contract and CSS cascade|[Theme System](../en/theme-system.md)|
|Incremental Build and cache semantics|[Build System](../en/build-system.md)|
|Commands and their user-facing behavior|[CLI](../en/cli.md)|
|Diagnostics and inspection|[Diagnostics](../en/diagnostics.md) / [Framework Inspector](../en/inspector.md)|
|Public framework surface|[Framework Reference](../en/framework-reference.md)|

Use the localized Japanese documentation when that is the target audience; the rules in this directory remain the implementation baseline.
