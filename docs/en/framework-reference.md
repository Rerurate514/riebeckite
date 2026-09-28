# Framework Reference

## Core public surface

Import portable framework APIs from `@riebeckite/core`. The package exports configuration helpers (`defineConfig`, `resolveConfig`, `isExcluded`, `isPublished`), content contracts and `ContentManager`, manifest and graph APIs, `Pipeline`, plugin contracts and dependency errors, build-state/cache utilities, diagnostics, observability types, publishing/post types, and theme contracts including `defineTheme`.

The package root export is the compatibility boundary. Prefer it over deep imports unless an implementation-specific task explicitly requires a private module.

## Extension surfaces

- **Content source:** replace source I/O while preserving scan/read/metadata semantics.
- **Plugin:** contribute pipeline transforms, lifecycle/content hooks, diagnostics, assets, client entries, endpoints, SEO, graph extensions, or renderers.
- **Theme:** provide theme config, styles, CSS tokens, and `data-*` attributes.
- **Integration:** bind Core to a framework/bundler; the current supported adapter is HonoX/Vite.

Each extension has a narrow contract. For example, a renderer returns `null` for input it does not handle, while an endpoint exposes reusable HTTP behavior without making Core own HonoX routing.

## Contract discipline

Keep public data serializable where it crosses a build/runtime boundary. Use explicit errors such as configuration validation and plugin dependency failures instead of inventing null protocols. Do not add an export merely to bypass an existing abstraction; first decide which package owns the behavior.

Read [Content system](content-system.md), [Plugin system](plugin-system.md), [Theme system](theme-system.md), and [HonoX integration](honox-integration.md) for detailed contracts.
