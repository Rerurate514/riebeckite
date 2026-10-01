# Writing Your First Plugin

Plugins add **functionality** to Riebeckite: Markdown or HTML transformation, client-side behavior, standalone pages, SEO, diagnostics, and more. Use a Theme when you only want to change appearance.

Plugins are trusted application code. When a Plugin emits HTML, page bodies, head tags, client entries, endpoints, or generated files, it is responsible for escaping untrusted text and validating URLs for the exact context. Riebeckite preserves raw Markdown HTML and does not sanitize Plugin-generated HTML. See [Security model](../security.md).

A Plugin can live directly inside a site; it does not have to be published as a package.

## 1. Create a minimal Plugin

Create Plugins with `definePlugin` from `@riebeckite/core`. A Plugin with only a `name` is the smallest valid form. Plugin factories can accept typed options when configuration is needed.

## 2. Add CSS

Declare Plugin-specific stylesheets through `assets`. Do not copy CSS into the site manually or reference `/node_modules` directly from the browser.

Use a stable root hook such as `rr-<feature>` on rendered output. See [Plugin API](../reference/plugin-api.md) for the CSS contract.

## 3. Transform Markdown or HTML

Semantic Markdown transformation belongs to Plugins. Simple remark Plugins can be declared as an array. Use `extendMarkdownPipeline` / `extendHtmlPipeline` when you need finer control of the processing pipeline.

For dependencies, lifecycle hooks, renderers, endpoints, and other extension points, see [Plugin API](../reference/plugin-api.md).

## 4. Add a standalone page when needed

Use `pageTypes` for standalone pages. A Page Type returns the HTML body, while the site's shared catch-all route applies the document frame and Theme.

Do not add Plugin-specific HonoX routes. Content embeds such as Canvas, Bases, and Excalidraw remain `renderers`.

See [Page System](../framework/page-system.md) for ownership, path resolution, and SSG behavior.

## 5. Package it when needed

Once a site-local Plugin works, it can be turned into a package. External Plugins should depend only on `@riebeckite/core`, declare their own subpaths through `exports`, and must not import `@riebeckite/core/src/**` or monorepo-internal paths.

## 6. Validate it

Use the repository's checks and tests relevant to the Plugin. `check`, `doctor`, and `inspect` are read-only diagnostics. Before creating a Plugin, also confirm that the requirement cannot be handled more simply by configuration or app-level code.

## Related

- [Plugin API](../reference/plugin-api.md)
- [Plugin System](../framework/plugin-system.md)
- [Architecture](../framework/architecture.md)
- [Writing Your First Theme](../themes/writing-a-theme.md)
