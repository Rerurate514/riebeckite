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
Phase 5 is therefore partial: the Inspector currently exposes the diagnostic
summary and diagnostic locations when present. It does not expose a page,
content, plugin, output, or dependency-data view, and does not guess an
element's source file, line, component, or CSS owner. Adding that capability
requires an explicit development-only source-map observation at the renderer
boundary.
