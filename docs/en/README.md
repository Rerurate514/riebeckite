> English documentation · [日本語](../ja/README.md) · [Agent documentation](../agents/README.md)

<p align="center">
  <img src="../../assets/logos/riebeckite-logo-horizontal.png" alt="Riebeckite" width="360" />
</p>

# Riebeckite Documentation

Riebeckite is an extensible, HonoX-based content framework for publishing Markdown and Obsidian-oriented notes on the web. It keeps content loading, interpretation, extension, presentation, and builds as separate, replaceable responsibilities instead of combining them into one Markdown-to-HTML process.

In a typical project, you point Riebeckite at a content directory, configure Markdown plugins and a theme, then develop and build through the HonoX/Vite integration. Plugins can compose the capabilities needed to publish a note collection: WikiLinks, embeds, attachments, content relationships, search, SEO, and more.

## Start here

|Goal|Read first|
|---|---|
|Start from scratch and go all the way to publishing|[Setup Guide](./setup.md)|
|Use the framework step by step|[Usage Guide](./guide.md)|
|Run or build a project|[Getting Started](./getting-started.md)|
|Find configuration fields|[Configuration](./configuration.md)|
|Understand ownership and dependency direction|[Architecture](./architecture.md)|
|Create or change a plugin or theme|[Plugin System](./plugin-system.md) / [Theme System](./theme-system.md)|
|Create a theme or plugin for the first time|[Your first theme](./theme-tutorial.md) / [Your first plugin](./plugin-tutorial.md)|
|Build a theme or plugin in depth|[Themes in depth](./theme-in-depth.md) / [Plugins in depth](./plugin-in-depth.md)|
|Keep articles and the site in separate places|[Separating content from the site](./content-and-site-repos.md) (in depth: [Separating content and the site (in depth)](./content-and-site-repos-in-depth.md))|
|Investigate a problem|[Diagnostics](./diagnostics.md) / [Framework Inspector](./inspector.md)|
|Contribute to this repository|[Repository Development](./development.md)|
|Write or run tests|[Testing](./testing.md)|

## How it fits together

```text
Markdown / assets
       │
       ▼
ContentSource ── scanning, reading, and source metadata
       │
       ▼
ContentManager ── content interpretation and orchestration
       ├── Manifest       page and metadata index
       ├── Content Graph  relationships such as WikiLinks
       └── Pipeline       Markdown / HTML / metadata transforms
                    │
                    ▼
                 Plugins ── capability extensions
                    │
                    ▼
       HonoX / Vite integration ── framework connection
                    │
                    ▼
            Application / Cloudflare Workers

Build tooling
  ├── Incremental Build and Build State
  ├── Plugin-scoped Cache
  ├── Diagnostics and Doctor
  ├── Logger / Tracer / Profiler
  └── CLI: check / doctor / inspect / profile / build / dev
```

### Responsibility boundaries

- **Core** owns content-processing contracts and orchestration. It does not depend on implementation details of HonoX, Vite, a specific plugin, or a theme.
- **Plugins** extend Markdown, HTML, metadata, assets, client behavior, endpoints, and SEO. They can declare ordering and dependencies through capabilities.
- **Integrations** connect Core to external frameworks and bundlers. HonoX/Vite-specific behavior belongs here.
- **Themes** are presentation contracts. They provide appearance through tokens, CSS, and stable hooks; they do not own content interpretation or build state.
- **Application** holds site-specific routes, islands, and components.
- **CLI** is Node.js build-time tooling. Cloudflare Workers request handling must not access build state or filesystem caches.

## Documentation map

### Setup and configuration

|Document|What it covers|
|---|---|
|[Setup Guide](./setup.md)|A beginner path through running the repository, creating a new site, and publishing to Cloudflare Workers|
|[Usage Guide](./guide.md)|The step-by-step path from installation and configuration to content, validation, build, and deployment|
|[Getting Started](./getting-started.md)|Prerequisites, a minimal configuration, install, verifying content, the dev server, and normal and full builds|
|[Separating content from the site](./content-and-site-repos.md)|Managing articles (an Obsidian vault, for example) and the site in separate repositories or folders, referencing an external vault with `content.directory`|
|[Separating content and the site (in depth)](./content-and-site-repos-in-depth.md)|Root resolution rules, pattern comparison, fetching a private vault in CI (extra checkout / submodule), copying assets, authentication, and troubleshooting|
|[Configuration](./configuration.md)|`riebeckite.config.ts`, Application Root, site, content, themes, plugins, validation, and secret handling|
|[CLI](./cli.md)|The `check`, `doctor`, `inspect`, `profile`, `build`, and `dev` commands, exit behavior, and packaging|

### Content and extensions

|Document|What it covers|
|---|---|
|[Content System](./content-system.md)|`ContentSource`, logical paths, `ContentManager`, public locations (`ContentPublicLocation`), Manifest, Content Graph, attachments, publication, and incremental metadata|
|[Plugin System](./plugin-system.md)|Plugin contracts, lifecycle, capabilities and dependencies, option validation, pipelines, renderers, assets, cache, and observability|
|[Theme System](./theme-system.md)|Theme contracts, color modes, typography, design tokens, CSS cascade, plugin boundaries, and package layout|
|[Your first theme](./theme-tutorial.md)|A minimal theme with `defineTheme`, CSS with semantic tokens and stable hooks, packaging for distribution, and verification|
|[Your first plugin](./plugin-tutorial.md)|A minimal plugin with `definePlugin`, assets and pipeline, packaging for distribution, key extension points, and verification|
|[Themes in depth](./theme-in-depth.md)|The `defineTheme` contract, common config, the design-token list, color modes, stable hooks, the CSS cascade, and packaging details|
|[Plugins in depth](./plugin-in-depth.md)|All extension points, capabilities, the content pipeline, renderers, client entries, the Plugin Cache, and packaging details|
|[HonoX Integration](./honox-integration.md)|The HonoX/Vite connection, Application Root responsibilities, and Cloudflare Workers/SSG boundaries|
|[Analytics](./analytics.md)|Browser page-view tracking (`@riebeckite/plugin-analytics`) and the independent Cloudflare Worker collector (`@riebeckite/analytics-cloudflare`)|

### Builds, operations, and inspection

|Document|What it covers|
|---|---|
|[Build System](./build-system.md)|Incremental Build, Build State, full builds, Plugin Cache distinctions, and the runtime boundary|
|[Observability](./observability.md)|Logger, Tracer, TraceSink, Profiler, and measurement conventions|
|[Diagnostics](./diagnostics.md)|`check`, `doctor`, structured diagnostics, and how they differ from Inspector|
|[Framework Inspector](./inspector.md)|Read-only inspection of configuration, plugins, content, graph, and build state|

### Design and contributor reference

|Document|What it covers|
|---|---|
|[Architecture](./architecture.md)|Core / Plugin / Integration / Theme / App ownership, dependency direction, and build-time/runtime separation|
|[Framework Reference](./framework-reference.md)|Major public Core APIs for config, content, pipeline, plugins, themes, diagnostics, and observability|
|[Repository Development](./development.md)|Monorepo layout, code placement, quality checks, CLI smoke checks, ESM, and generated state|
|[Testing](./testing.md)|Unit test layout, running and updating tests, golden files, and package test metadata|

## Representative capabilities

Compose the plugins your site needs. The repository includes capabilities in these areas:

- **Markdown and notes**: Obsidian Markdown, WikiLinks, embeds, attachments, Mermaid, Excalidraw, and media.
- **Reading experience**: syntax highlighting, enhanced code blocks, code tabs, diffs, TOC, backlinks, recent posts, lightbox, and automatic card links.
- **Navigation**: search, local graph, garden explorer, and a graph of content relationships.
- **Publishing and discovery**: SEO, RSS / Atom / JSON Feed, sitemap, `robots.txt`, and plugin-provided endpoints.
- **Analytics**: storage-independent page-view tracking keyed by stable content IDs, plus an independent Cloudflare Worker collector with D1/KV storage.
- **Developer experience**: config and plugin-option validation, incremental builds, Plugin Cache, diagnostics, doctor, structured logging, tracing, profiling, and inspector.
- **Presentation**: replaceable themes and a CSS contract shared by themes and plugins, including runtime color-mode switching (`@riebeckite/plugin-color-mode`).

Check the relevant package and the system documentation above for exact availability, options, and implementation constraints.

## Everyday commands

Run these at the project root:

```bash
pnpm exec riebeckite check    # validate configuration and plugin resolution
pnpm exec riebeckite doctor   # read-only health diagnostics
pnpm exec riebeckite inspect  # show the framework's interpreted state
pnpm exec riebeckite dev      # start development
pnpm exec riebeckite build    # incremental build
pnpm exec riebeckite build --full
pnpm exec riebeckite profile  # trace-based performance report
```

`check`, `doctor`, `inspect`, and `profile` have intentionally different purposes. Do not substitute a mutating build for diagnosis; see [CLI](./cli.md) and [Diagnostics](./diagnostics.md) for details.

## Suggested reading path

For a new site, start with [Getting Started](./getting-started.md), [Configuration](./configuration.md), and [Content System](./content-system.md). Read [Plugin System](./plugin-system.md) before adding a plugin, and [Theme System](./theme-system.md) before changing appearance. If you are creating a theme or plugin for the first time, [Your first theme](./theme-tutorial.md) and [Your first plugin](./plugin-tutorial.md) are good starting points; for keeping articles and the site separate, see [Separating content from the site](./content-and-site-repos.md). When you finish the introductions and want to build out full detail, use the in-depth companions ([Themes in depth](./theme-in-depth.md), [Plugins in depth](./plugin-in-depth.md), and [Separating content and the site (in depth)](./content-and-site-repos-in-depth.md)). To investigate an issue, use `check`, `doctor`, and `inspect` in that order.

For coding agents and automation, use the concise, rule-oriented [Agent documentation](../agents/README.md).
