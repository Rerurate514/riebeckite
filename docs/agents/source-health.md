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
- runtime import cycles (module level, failures)
- directory dependency cycles (advisory)
- Core / Plugin / Integration / Theme dependency violations
- Node builtins and Node-only packages imported from Browser/Worker entries
- wildcard exports

Generated files, fixtures, snapshots, migrations, tests, templates, and build
output are excluded. Line counts are advisory and never fail the check. Runtime
cycles, cross-layer dependencies, the browser/Node boundary, and wildcard
exports do.

Browser/Worker entries are files under a `client` or `browser` directory and
files named `*.client.*`, `*.browser.*`, or `worker.*`. They must not import
`node:` builtins, `fs`/`path`/`os`, `@riebeckite/node`, `@riebeckite/cli`, or
`@riebeckite/preview`.

## Current snapshot

Run `pnpm check:source-health` for the current source counts and structural
findings. Counts are intentionally not stored here because ordinary source
changes make a checked-in snapshot stale. The command fails only for runtime
cycles, cross-layer dependency violations, the browser/Node boundary, and
wildcard exports; size signals remain review inputs, not split targets.

## Classification

| Area | Main responsibility | Class | Decision |
| --- | --- | --- | --- |
| `packages/core/src/plugin/plugin_runtime.ts` | lifecycle hooks, external dependencies, assets, diagnostics | B, D | Page resolution and manifest-hook execution moved out. The remaining runtime surface is cohesive; split again only when a hook family gains independent state. |
| `packages/core/src/content/content_manager.ts` | build orchestration, manifest reuse, cache, build state | B, D | Manifest assembly, reuse policy, and output-change resolution moved out. Keep the remaining build orchestration and cache ownership as the composition point. |
| `packages/core/src/pipeline.ts` | Markdown execution orchestration | A | Link normalization and embed-fragment selection moved out. Keep the pipeline order together. |
| `packages/plugins/bases/src/evaluate.ts` | Bases expression evaluation | A | Condition comparison and matching moved to `conditions.ts`; keep AST evaluation and execution order together. |
| `packages/plugins/l10n/src/l10n.ts` | localization plugin composition | A | Detection, options, routing, signatures, head tags, and queries now have independent modules. |
| `packages/create-riebeckite/src/scaffold/content-pages.ts` | localized scaffold page content | A | Data-heavy single purpose. Split only when page groups gain independent ownership. |
| `packages/create-riebeckite/src/scaffold/presets.ts` | preset definitions | A | Declarative data. Keep together. |
| `scripts/release.mjs` | release orchestration and publishing | B | Operational script. Split by phase only when the release flow changes. |
| `packages/cli/src/commands/deploy_setup.ts` | interactive deployment setup and file mutation | B | Review prompts, domain validation, and deployment config as separate change reasons. |
| `packages/plugins/garden-explorer/components/garden-explorer.tsx` | interactive graph UI | B, C | Component rendering, graph state, and layout are candidates for separation. |
| `packages/integrations/honox/src/ssg/output_cache.ts` | persistent output cache and validation | A | Cohesive cache repository after the SSG split. Around 500 lines is the review range, not a failure. |
| `packages/plugins/search/index.ts` | search plugin entry and public contract | C | Fixed: wildcard export replaced with explicit exports. |
| `packages/plugins/docs/index.ts`, `packages/plugins/share/index.ts` | plugin entry plus data helpers | C | Fixed: public data helpers moved to `src/data.ts`; components no longer import the package entry. |

## Completed structural changes

### Mutation and Migration

`file_system_content_mutation.ts` kept plan/apply/rollback plus journal
serialization. Journal parsing and plan serialization now live in
`mutation_journal.ts`. `file_system_content_migration.ts` keeps the migration
lifecycle; migration state/history/lock persistence now lives in
`migration_state_store.ts`. Both files keep their public classes and behavior.

### Content source creation

The repeated `config.content.source ?? new FileSystemContentSource(directory,
exclude)` rule now lives in `createContentSource` in `@riebeckite/node`. CLI,
HonoX generated runtime modules, Inspector, Diagnostics, and the web asset
script call the factory; each keeps its own directory override.

### Plugin contract verification

The verifier moved from `@riebeckite/test/plugin-contract` to the CLI command
implementation because `riebeckite plugin verify` is a production CLI feature.
`@riebeckite/test` is now a dev-only test package; CLI no longer depends on it.

### Development trace

`createDevelopmentTrace` moved from HonoX to `@riebeckite/diagnostics`. HonoX
continues to re-export it from `@riebeckite/honox/runtime`, but the move removes
the Inspector test's dev dependency on HonoX and the package-level cycle.

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

### Plugin runtime

`plugin_runtime.ts` combined lifecycle orchestration with page-type resolution,
manifest-hook caching, assets, diagnostics, and generated outputs. Page
resolution and manifest-hook execution now live in focused collaborators:

- `plugin_pages.ts` — page registration validation, resolution, routes, outputs
- `manifest_hooks.ts` — manifest hook cache, snapshots, metrics, fast-path reason
- `plugin_runtime_context.ts` — shared plugin context types
- `plugin_runtime.ts` — lifecycle and content/plugin orchestration

The public `PluginRuntime` methods and `ManifestHookMetrics` exports remain
available.

### Content manifest assembly

`content_manager.ts` mixed build orchestration with manifest entry assembly,
public-view projection, HTML synchronization, and manifest-entry reuse. Those
responsibilities now live in:

- `manifest_assembler.ts` — entry creation, graph build, public view, HTML sync
- `content_manifest_reuse.ts` — reuse eligibility and deterministic entry cloning
- `content_output_resolver.ts` — plugin page routes, generated outputs, output changes
- `content_manager.ts` — build plan, cache ownership, build state, orchestration

### Localization

`l10n.ts` combined option validation, language detection, localized routing,
signatures, head tags, and query helpers. It is now the plugin composition root:

- `options.ts` — option validation and canonicalization
- `detection.ts` — content language detection and diagnostics
- `routing.ts` — localized locations, redirects, and links
- `signatures.ts` — content-cache signatures
- `head_tags.ts` — alternate language tags
- `query.ts` — localization query helpers
- `types.ts` — shared localization contracts

The public l10n exports remain available from `l10n.ts`.

### CLI interactive parsing

`cli.ts` keeps command dispatch and its error boundary. Interactive command
argument parsing and usage errors now live in:

- `interactive_command_parser.ts` — page, component, plugin, theme, preview, dev, and verify arguments
- `cli_usage_error.ts` — shared CLI usage error

### Icon packs

`settings.ts` retains settings orchestration and its public exports. Icon-pack
filesystem loading, validation, and normalization now live in `icon_packs.ts`.

### Bases conditions

`evaluate.ts` keeps expression evaluation and execution order. Value references,
comparisons, and link, tag, and folder matching now live in `conditions.ts`.

### Markdown link normalization

`pipeline.ts` contained the Markdown processor order, link rewriting, resolved
link dependency recording, and embed fragment selection. They are now separated:

- `markdown_links.ts` — Markdown link rewriting and link dependency values
- `markdown_fragments.ts` — heading and block embed selection
- `pipeline.ts` — processor construction and content pipeline execution

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

## Known accepted warnings

The directory cycle check reports five advisory cycles. The module graph is
acyclic for each of them; the edges are registration or barrel imports that
point back to shared helpers.

| Cycle | Why it is accepted |
| --- | --- |
| `packages/cli/src` ↔ `src/command` | The command registry imports command implementations, and those implementations import shared runner/output helpers from `src`. |
| `packages/core/src` → `content` → `derived` → `plugin` → `types` → `src` | Content builds derived views, derived views use plugin contracts, and the type barrels re-export shared types. No runtime module cycle exists. |
| `packages/plugins/diagnostics/src` ↔ `src/checks` | The checks registry imports checks, and checks use the shared diagnostics runner and output types. |
| `packages/plugins/garden-explorer/components` ↔ `src` | The package entry exports the component, and the component imports its data helpers from `src`. |
| `packages/plugins/related-posts/components` ↔ `src` | The package entry exports the component, and the component imports its data helpers from `src`. |

Biome also reports eight `lint/complexity/noBannedTypes` warnings and one
`lint/suspicious/noConfusingVoidType` warning in the Core CLI generic defaults
(`{}` for "no options" and `void` in `CliCommandResult`). Both are intentional:
`{}` is the empty option object used by inference, and `void` lets handlers
return nothing. The three `lint/complexity/noUselessStringRaw` infos embed
client scripts and styles, where `String.raw` preserves escapes.

## Next review order

1. `content_manager.ts`: if the next change touches entry assembly, extract that
   phase as one unit; do not separate the build plan from cache ownership.
2. `deploy_setup.ts` and `release.mjs`: split by phase after their contracts are
   covered by focused tests.
3. `content-pages.ts`: split only when page groups gain independent ownership.
4. UI components: separate model/state from rendering when the next feature
   touches them, not as a standalone cleanup.

Any split must preserve public APIs and outputs, move data with behavior, avoid
new wrappers or barrels, and be verified before a local commit.
