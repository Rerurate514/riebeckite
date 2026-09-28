# Plugin System Rules for Agents

Source of truth: `packages/core/src/types/plugin.ts` and
`plugin_context.ts`.

Choose the smallest extension point: pipeline work for transformations,
content hooks for named phases, assets/client entries for package-owned browser
behavior, endpoints for reusable HTTP behavior, and renderers for handled
targets. Plugins must not become application routers or a second filesystem
content loader.

## Contract

A plugin may use identity/options/order/enabled, capabilities
(`provides`, `requires`, `optional`), `cacheVersion`, option validation,
lifecycle hooks, content hooks, remark/rehype pipeline extension, graph
extension, diagnostics, renderers, assets, client entries, endpoints,
and SEO extensions.

## Rules

-   Use the smallest extension point that satisfies the feature.
-   Express real plugin dependencies with capabilities rather than
    fragile numeric ordering.
-   Preserve stable dependency resolution and actionable
    missing/duplicate/cycle errors.
-   Runtime option validators must be side-effect free.
-   Use injected `cache`, `logger`, and `tracer`; avoid global framework
    singletons.
-   Plugin Cache is build-time, namespaced, regenerable, JSON-oriented
    storage; never a runtime database.
-   Keep plugin-specific CSS/client code in the plugin package and
    expose it through asset/client-entry contracts.
-   Do not copy plugin CSS into the app as the normal integration
    mechanism.
-   Do not rescan the content filesystem when Manifest/ContentGraph
    already contains the needed data.
-   Renderer non-matches should return `null`.
-   HTTP host-framework binding belongs in Integration; plugin endpoint
    behavior should use the endpoint contract.
-   Use structured diagnostics and tracing.
-   Preserve original error causes and plugin/hook identity.
-   NodeNext/ESM output must resolve under Node after build.
