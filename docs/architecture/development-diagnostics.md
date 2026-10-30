---
date: 2026-10-20
title: Development diagnostics architecture
---
# Development diagnostics architecture

## Scope

Riebeckite Doctor and the Development Inspector share `@riebeckite/diagnostics`.
The package owns the serializable report model and converts observations already
provided by Core into stable, ordered diagnostics. It does not own content
parsing, plugin execution, output planning, configuration resolution, or a UI.

The Inspector is a serve-only, read-only observer. It does not build content,
recreate a `ContentManager`, execute plugin hooks, write build state, or apply
site CSS.

## Reused observations

| Concern | Existing source | Inspector use |
| --- | --- | --- |
| Content integrity and WikiLinks | completed manifest diagnostics | Uses the diagnostics recorded by the build without re-running `inspect()`. |
| Plugin ordering and capabilities | resolved config and `resolvePlugins()` | Shows the resolved order plus configured plugins that were disabled. |
| Output ownership | `buildOutputPlan()` and `compareOutputPlan()` | Keeps output classifications identical to the SSG. |
| Incremental dependencies | completed `OutputChangeSet` | Displays affected, unchanged, and removed outputs with their tracked dependencies. |
| Plugin execution | `TraceSpan` and `TraceEvent` recordings | Aggregates the existing hook spans; it never calls a hook to measure it. |
| Themes | resolved theme configuration | Compares configured settings with values observed in the browser. |
| Development server | the existing HonoX/Vite integration | Adds serve-only Vite middleware and a client virtual module. |

## Completed build snapshot

A successful `ContentManager` build publishes one immutable
`CompletedContentBuildSnapshot`. It contains the manifest, the output change set,
full-regeneration reasons, plugin inventory, manifest-hook metrics, and the
development trace. `completedAt` and `startedAt` describe the measured build
window. Collections that the Inspector reads are frozen or copied before
publication so a later build cannot change an already-published snapshot.

The Inspector locates the application's existing `content` export in Vite's SSR
module graph and calls `getCompletedBuildSnapshot()`. It never constructs a
`ContentManager`. Before any completed build exists the report, output, graph,
and plugin endpoints return an explicit `unavailable` state.

Content edits, content creation/deletion, and configuration changes advance one
Inspector revision. The Inspector remembers when invalidation happened and only
accepts a snapshot whose `completedAt` is at or after that point. If the current
revision has no completed build yet, it reports `unavailable` instead of showing
the previous revision as current. Add/unlink events are coalesced for 150 ms, so
a rename produces one revision and one inspection.

## Tabs

The right dock uses a Shadow DOM and keeps the existing tabs:

- **Overview** shows the page, theme, and revision.
- **Diagnostics** searches and filters diagnostics from the completed manifest.
- **Dependencies** combines the build-output dependency graph and the existing
  dependency summary.
- **Plugins** shows plugin resolution and recorded hook execution.
- **Output** shows the output change set, lookups, regeneration reasons, and a
  Graph button for each output.
- **Theme** shows resolved theme configuration and CSS tokens observed in the
  browser.

## Dependency graph

`/__riebeckite/inspector/graph` is backed by the completed `OutputChangeSet`,
`OutputPlan`, and `OutputDependency` data. It is a build-output dependency graph,
not the WikiLink content graph. Content nodes are labelled `content:<slug>`;
output nodes are labelled `output:<path>`; other dependency kinds use
`tag:`, `folder:`, `file:`, `public-location:`, `projection:`, `external:`,
`content-query:`, `global`, or `unknown`.

The endpoint supports `node`, `q`, `kind`, `direction` (`both`, `in`, `out`),
`page`, and `limit` (maximum 100). Initial results contain output roots only.
Selecting a node returns its immediate incoming and outgoing neighbours, not the
whole vault. Search, filtering, and paging happen on the server. Node status is
`affected`, `unchanged`, or `removed`, and affected outputs include the recorded
regeneration reason. Graph edges are only sent for nodes visible on the current
page.

## Plugin execution

`/__riebeckite/inspector/plugins` reads the trace stored in the completed
snapshot. Each plugin entry includes resolution order, enabled state,
capabilities (`provides`, `requires`, `optional`), recorded hook count,
cumulative duration, failed hooks, diagnostic count, and cache hit/miss/bypass
counts. Disabled plugins are shown from the configured plugin inventory and have
no hook runs.

Hook rows aggregate spans with the attributes `{ plugin, hook }`. A hook that
did not run has no row. A failed span marks the aggregate as failed. When a build
has no trace recorder, durations are shown as `not measured`; the Inspector does
not estimate them.

Plugin durations are sums of span durations. Concurrent or nested hooks can
overlap, so the sum is not wall-clock time. The separate content-build wall clock
is `completedAt - startedAt`. The trace window is the span from the earliest
recorded start to the latest recorded end.

The endpoint supports `q`, `plugin`, `sort` (`duration` or `name`), `page`, and
`limit` (maximum 100). Measuring adds at most the existing span calls; the
Inspector performs no measurement work of its own beyond aggregation.

## Theme and style observation

The report includes the resolved theme name, color mode, layout, styles,
stylesheets, setting values, applied data attributes, and the generated setting
style. The Theme tab uses this configuration as the expected state.

CSS tokens beginning with `--rb-` or `--rr-` are collected from readable
`document.styleSheets`, plus the root inline style. Each token shows its computed
value on `<html>`, its configured value when one exists, and the readable
stylesheet that declared it. Cross-origin stylesheets that cannot be read are
counted, not guessed. A token with no computed value is marked `undefined`; a
token whose computed value differs from the configured setting is marked
`mismatch`. Ownership is never inferred beyond an actual readable sheet URL or
"inline stylesheet".

The tab re-renders when root attributes or the system color preference change.
It only observes: site CSS and theme CSS keep their existing responsibilities,
and the Inspector never edits a token or stylesheet.

## Output queries and regeneration evidence

`/__riebeckite/inspector/output` keeps its unparameterized response shape and
adds server-side query parameters:

- `page` and `limit` (maximum 100) paginate the affected, unchanged, and
  removed output lists. `status`, `kind`, and `q` filter them.
- `output` resolves one output path to its tracked dependencies and related
  outputs. `changed` lists the directly dependent outputs that a content change
  affects.
- Listed rows carry the recorded cause: affected outputs name the changed
  dependency, unchanged outputs report that no tracked dependency changed, and
  removed outputs report that they are absent from the current inventory.
- `dpage`, `dlimit`, `dkind`, and `dq` paginate and filter the dependency rows.

The endpoint filters and paginates the completed change set. It does not send
every row and does not rebuild the plan for each query.

Full-regeneration reasons use existing Core evidence: the build state status,
`isPersistentlyCacheable`, the pipeline fingerprint, and the reasons recorded in
the output change set. When a cause cannot be attributed to an existing
observation, the report lists it under `unknown` instead of guessing.

## Access and production boundaries

All Inspector endpoints are loopback-only, respond with `no-store`, validate
their query parameters, and are ordered before HonoX's catch-all development
middleware. Failures return opaque error codes rather than filesystem paths or
configuration values.

`@riebeckite/diagnostics` depends on Core. The CLI renders reports. The HonoX
integration serves reports and the Inspector UI only while Vite is serving. The
production client module never imports the Inspector, the Inspector plugin uses
`apply: "serve"`, and the development trace module is imported only by the
serve-only content runtime.

The launcher is available only while serving. Use Ctrl+Alt+R outside editable
controls to open or close it; Escape closes it and restores focus to the
launcher.

## Known observation limits

Element-to-source mappings are not preserved through the Markdown/HTML
pipeline, so the Inspector does not offer an element picker or DOM-to-Markdown
mapping. It also does not compare the output plan with files on disk. CSS
ownership is shown only when a stylesheet is actually readable in the browser.
Adding element-level inspection would require an explicit development-only
source-map observation at the renderer boundary.
