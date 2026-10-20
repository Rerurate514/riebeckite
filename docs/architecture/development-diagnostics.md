---
title: Development diagnostics architecture
---
# Development diagnostics architecture

## Scope

Riebeckite Doctor and the Development Inspector share `@riebeckite/diagnostics`.
The package owns the serializable report model and converts observations already
provided by Core into stable, ordered diagnostics. It does not own content
parsing, plugin execution, output planning, configuration resolution, or a UI.

## Reused observations

| Concern | Existing source | Diagnostic use |
| --- | --- | --- |
| Content integrity and WikiLinks | `ContentManager.inspect()` | Uses the existing diagnostics without reimplementing link analysis. |
| Plugin ordering and configuration | resolved config and `resolvePlugins()` | Reports the resolution result or the resolution error. |
| Output ownership | `buildOutputPlan()` and `compareOutputPlan()` | Keeps output classifications identical to the SSG. |
| Incremental dependencies | `ContentManager.getOutputChangeSet()` | Classifies output observations and explicitly marks unavailable observations. It does not serialize a dependency graph. |
| Themes | resolved theme configuration | Reports the resolved styles; load failures remain configuration diagnostics. |
| Development server | the existing HonoX/Vite integration | Adds a serve-only Vite middleware and client virtual module. |

## Boundaries

`@riebeckite/diagnostics` depends on Core. The CLI renders reports. The HonoX
integration serves reports and the Inspector UI only while
Vite is serving. The Inspector uses a Shadow DOM so its styles do not affect a
site, theme, or plugin.

The production client module never imports the Inspector module. The Inspector
middleware uses Vite's `apply: "serve"`, so neither its endpoint nor its client
code is present in production output.

## Known observation limits

Element-to-source mappings are not preserved through the Markdown/HTML pipeline.
The Inspector presents Overview, Diagnostics, Dependencies, Plugins, and
Output tabs. It does not trigger content inspection or output planning merely
to populate a development view: unavailable capabilities are labelled as such.
It reports the current URL path and resolved plugins, but does not guess an
element's source file, line, component, or CSS owner. Adding element-level
inspection requires an explicit development-only source-map observation at the
renderer boundary.

The launcher is available only while serving. Use Ctrl+Alt+R outside editable
controls to open or close it; Escape closes it and restores focus to the
launcher. The report endpoint is loopback-only, responds with `no-store`, and
is ordered before HonoX's catch-all development middleware.
