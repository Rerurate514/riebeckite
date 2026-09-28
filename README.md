# Riebeckite

> [日本語](./README_ja.md)

Riebeckite is an extensible content framework for publishing Markdown and Obsidian-oriented notes on the web. It separates content loading, interpretation, extensions, presentation, and builds, so a site can grow without turning its Markdown pipeline into one large application-specific process.

The repository is a pnpm monorepo. Its reference application uses HonoX, Vite, and Cloudflare Workers, while Core keeps the content contracts independent of those framework details.

## What it provides

- A content system that scans Markdown and assets, produces a manifest, and builds a graph of content relationships.
- A plugin system for Markdown and HTML transforms, assets, browser behavior, endpoints, SEO, diagnostics, and more.
- Theme contracts based on semantic CSS tokens, stable hooks, color modes, and typography settings.
- HonoX/Vite integration for development, static builds, and deployment-oriented applications.
- Build and operational tooling: incremental builds, plugin caches, diagnostics, Doctor, Inspector, logging, tracing, and profiling.

Included plugins cover Obsidian Markdown, WikiLinks and embeds, attachments, Mermaid, Excalidraw, media, syntax-highlighted code blocks, tabs, table of contents, backlinks, search, local graphs, garden exploration, SEO, feeds, and sitemaps.

## How the pieces connect

```text
Markdown and assets
        │
        ▼
ContentSource ── scan, read, and describe source files
        │
        ▼
ContentManager ── interpret content and coordinate processing
        ├── Manifest
        ├── Content Graph
        └── Pipeline
                     │
                     ▼
                  Plugins
                     │
                     ▼
        HonoX / Vite integration
                     │
                     ▼
       Application / Cloudflare Workers
```

Core owns portable contracts and orchestration. Plugins add reusable behavior, integrations adapt Core to external frameworks, themes own presentation, and an application owns its routes and site-specific components. See the [architecture guide](./docs/en/architecture.md) for the dependency rules.

## Get started

Install workspace dependencies, then validate the reference application from the repository root:

```bash
pnpm install
pnpm exec riebeckite check
pnpm exec riebeckite doctor
```

For day-to-day development of the included application:

```bash
pnpm dev
pnpm build
```

The CLI is intended to run from a root directory. Its main commands are:

```bash
pnpm exec riebeckite check          # validate configuration and plugins
pnpm exec riebeckite doctor         # run read-only health checks
pnpm exec riebeckite inspect        # inspect resolved framework state
pnpm exec riebeckite dev            # start development
pnpm exec riebeckite build          # run an incremental build
pnpm exec riebeckite build --full   # rebuild without incremental reuse
pnpm exec riebeckite profile        # produce a trace-based performance report
```

`check`, `doctor`, and `inspect` do not replace one another: validation, health diagnostics, and state inspection are separate operations. Read the [CLI reference](./docs/en/cli.md) before automating them.

## Repository layout

| Path | Responsibility |
| --- | --- |
| [`packages/core`](./packages/core) | Content contracts, pipeline, plugin and theme APIs, diagnostics, and observability |
| [`packages/cli`](./packages/cli) | Node.js CLI and build-time tooling |
| [`packages/integrations/honox`](./packages/integrations/honox) | HonoX and Vite integration |
| [`packages/plugins`](./packages/plugins) | Reusable content, presentation, and publishing extensions |
| [`packages/themes`](./packages/themes) | Built-in CSS themes and token implementations |
| [`apps/web`](./apps/web) | Reference HonoX application |
| [`docs/en`](./docs/en/README.md) | English documentation |
| [`docs/ja`](./docs/ja/README.md) | Japanese documentation |

## Documentation

Start with the [English documentation index](./docs/en/README.md), especially:

1. [Getting Started](./docs/en/getting-started.md) for the workspace and a minimal configuration.
2. [Configuration](./docs/en/configuration.md) for `riebeckite.config.ts`.
3. [Content System](./docs/en/content-system.md) for sources, manifests, and graphs.
4. [Plugin System](./docs/en/plugin-system.md) or [Theme System](./docs/en/theme-system.md) before extending a site.

Package-specific documentation is kept beside each package. Japanese readers can use [README_ja.md](./README_ja.md) or the [Japanese documentation index](./docs/ja/README.md).

## Development

The root scripts are:

```bash
pnpm lint       # biome lint .
pnpm format     # format files with Biome
pnpm check      # apply Biome checks and fixes
pnpm build      # build the CLI and reference web application
```

Before changing Core, a plugin, an integration, or a theme, read [Repository Development](./docs/en/development.md) and the relevant architectural guide. Keep Core free of framework- and package-specific reverse dependencies.
