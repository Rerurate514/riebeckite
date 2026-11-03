# @riebeckite/dev-inspector

Development-only inspector overlay for Riebeckite sites built with Vite.

[日本語](./README_ja.md)

The inspector serves diagnostics, output plans, the dependency graph, plugin execution, assets, and regeneration details from a Vite dev server. It is applied only while serving; production builds are unaffected.

Import `riebeckiteDevelopmentInspector` and add it to your Vite plugins during development.

Custom integrations pass a snapshot provider: `riebeckiteDevelopmentInspector(getApplication, { getSnapshot })`. `getSnapshot(server)` returns the current `CompletedContentBuildSnapshot` or `undefined`; the HonoX integration supplies one. Call `invalidateDevelopmentInspector(server)` when content changes; HonoX does this automatically.
