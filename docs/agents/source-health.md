---
title: Source Health Audit
---
# Source Health Audit

## Method

`pnpm check:source-health` parses every non-test TypeScript and JavaScript source
file under `packages`, `apps`, and `scripts`. It measures physical lines and
function bodies with the TypeScript AST, follows runtime imports, and reports:

- files at or above 400 lines (800+ requires a split review)
- functions at or above 80 lines
- large files that grew beyond the advisory baseline
- runtime import cycles
- Core / Plugin / Integration dependency violations
- wildcard exports

Generated files, fixtures, snapshots, migrations, tests, templates, and build
output are excluded. Line counts never fail the check. Runtime cycles,
cross-layer dependencies, and wildcard exports do.

The current baseline is `scripts/source_health_baseline.json`. Update it only
when a large cohesive unit intentionally changes size:

```bash
node scripts/check_source_health.mjs --write-baseline
```

## Current snapshot

- 696 source files, 88,131 lines, 5,565 functions
- 33 files at or above 400 lines; 6 at or above 800
- 75 functions at or above 80 lines
- 0 runtime import cycles
- 0 cross-layer dependency violations
- 0 wildcard exports

These are review signals, not split targets.

## Classification

| Area | Main responsibility | Class | Decision |
| --- | --- | --- | --- |
| `packages/core/src/plugin/plugin_runtime.ts` | lifecycle hooks, manifest hook cache, page resolution, assets, diagnostics | B, D | Split by lifecycle/ownership in a dedicated change. Highest remaining Core risk. |
| `packages/core/src/content/content_manager.ts` | build orchestration, manifest assembly, cache reuse, output changes | B, D | Keep as the composition point for now. Extract only a boundary with independent state and tests. |
| `packages/core/src/pipeline.ts` | Markdown execution plus link normalization helpers | B | Link normalization is a plausible extraction, but it is coupled to dependency tracking. Review with pipeline tests. |
| `packages/plugins/bases/src/evaluate.ts` | Bases expression evaluation | A | Cohesive domain module. Review `memberCall`; do not split by line count. |
| `packages/plugins/l10n/src/l10n.ts` | localization detection, routing, rendering, options | B | Confirm independent change reasons before splitting. |
| `packages/create-riebeckite/src/scaffold/content-pages.ts` | localized scaffold page content | A | Data-heavy single purpose. Split only when page groups gain independent ownership. |
| `packages/create-riebeckite/src/scaffold/presets.ts` | preset definitions | A | Declarative data. Keep together. |
| `scripts/release.mjs` | release orchestration and publishing | B | Operational script. Split by phase only when the release flow changes. |
| `packages/cli/src/commands/deploy_setup.ts` | interactive deployment setup and file mutation | B | Review prompts, domain validation, and deployment config as separate change reasons. |
| `packages/plugins/garden-explorer/components/garden-explorer.tsx` | interactive graph UI | B, C | Component rendering, graph state, and layout are candidates for separation. |
| `packages/integrations/honox/src/ssg/output_cache.ts` | persistent output cache and validation | A | Cohesive cache repository after the SSG split. Around 500 lines is the review range, not a failure. |
| `packages/plugins/search/index.ts` | search plugin entry and public contract | C | Fixed: wildcard export replaced with explicit exports. |
| `packages/plugins/docs/index.ts`, `packages/plugins/share/index.ts` | plugin entry plus data helpers | C | Fixed: public data helpers moved to `src/data.ts`; components no longer import the package entry. |

## Completed structural changes

### HonoX SSG

`ssg_plugin.ts` mixed Vite orchestration, output cache persistence, fast-path
verification, client artifact preservation, filesystem safety, diagnostics, and
timing. It is now split into:

- `ssg_plugin.ts` — Vite plugin lifecycle and build orchestration
- `ssg/output_cache.ts` — persistent cache, fast-path state, cache validation
- `ssg/inventory.ts` — app/public/output fingerprints
- `ssg/build_output.ts` — client artifacts, output cleanup, oversized assets
- `ssg/diagnostics.ts` — SSG and generated-HTML diagnostics
- `ssg/runtime_metrics.ts` — timing and metrics output
- `ssg/types.ts` — internal SSG contracts
- `ssg/file_system.ts` — shared safe-path and filesystem error helpers

The public exports of `ssg_plugin.ts` remain available, so callers and tests do
not change.

### Scaffold templates

`templates.ts` imported `content-pages.ts` while `content-pages.ts` imported
helpers from `templates.ts`. The cycle also mixed template assembly, README
generation, localized demo data, and option rendering. It is now split into:

- `templates.ts` — scaffold file assembly
- `readme.ts` — README generation
- `readme_demos.ts` — demo examples and plugin predicates
- `template_options.ts` — option depth and rendering
- `template_types.ts` — shared template contracts

### Plugin public surface

Docs and share components imported their own package entry, creating a runtime
cycle between the component and the plugin factory. Their data helpers now live
in `src/data.ts`, and the entries re-export the same public symbols.

## Next review order

1. `plugin_runtime.ts`: separate lifecycle/hook execution from page, asset, and
   diagnostic collection while keeping `PluginContext` stable.
2. `content_manager.ts`: extract a manifest assembly boundary only if the build
   plan, cache ownership, and output change set can stay together.
3. `pipeline.ts`: move link normalization and dependency recording as one unit,
   not as isolated functions.
4. `deploy_setup.ts` and `release.mjs`: split by phase after their contracts are
   covered by focused tests.
5. UI components: separate model/state from rendering when the next feature
   touches them, not as a standalone cleanup.

Any split must preserve public APIs and outputs, move data with behavior, avoid
new wrappers or barrels, and be verified before a local commit.
