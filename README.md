<p align="center">
  <img src="./assets/logos/riebeckite-logo-horizontal.png" alt="Riebeckite" width="480" />
</p>

# Riebeckite

> [日本語](./README_ja.md)

Riebeckite is an extensible content framework for publishing Markdown and Obsidian-oriented notes on the web. It separates content loading, interpretation, extensions, presentation, and builds, so a site can grow without turning its Markdown pipeline into one large application-specific process.

This repository is a pnpm monorepo containing the framework core, its CLI, the HonoX/Vite integration, plugins, themes, and a reference HonoX application. This document is the entry point: it shows how to start the bundled application, then points to the documentation for configuration and extension.

## Requirements

- Node.js (LTS)
- pnpm

Dependencies are managed with pnpm workspaces, so install and run commands with pnpm.

If you are not used to setting up development tools, start with the [Setup Guide](./docs/en/setup.md). It walks through installing Node.js and Git, then opening the site in a browser.

## Create a new site

Scaffold a standalone site from an official preset with
[`create-riebeckite`](./packages/create-riebeckite):

```bash
npx create-riebeckite my-site
cd my-site
npm install
npm exec riebeckite build
```

| Option | What it does |
| --- | --- |
| `[directory]` | Directory to scaffold into (default: the current directory) |
| `--preset <name>` | Starter composition to use (default: `starter`) |
| `--force` | Scaffold even when the target directory is not empty |
| `--list-presets` | List the available presets and their descriptions |

Every preset is a self-contained starter, from smallest to largest:

| Preset | What it does |
| --- | --- |
| `empty` | Blank application shell — no plugins, theme, or content |
| `minimal` | Smallest useful site: Obsidian Markdown, the minimal theme, one page |
| `starter` | Default starter: Obsidian Markdown, color mode, seven languages, site header |
| `rich` | Publishing and reading plugins plus guided ecosystem tour pages |
| `full` | Ready blog: discovery, media, and reading plugins plus a build guide |
| `max` | Diagram and knowledge plugins on top of `full`, with example pages |
| `ultra` | Full plugin catalog and theme reference pages |

Start from `starter` and add only what your site needs. The reference
application in this repository is a fully customized example. See
[Getting Started](./docs/en/getting-started.md) for the complete flow.

## Start the reference application

```bash
pnpm install     # install workspace dependencies
pnpm dev         # prepare assets and start the development server
```

`pnpm dev` prepares the attachment assets for `apps/web`, then starts the Vite/HonoX development server. Open the URL printed in the terminal. While the server runs, edits under `content/` and the application are picked up automatically.

## Build, preview, and deploy

```bash
pnpm build                              # build the CLI and the reference application
pnpm --filter @riebeckite/web preview   # serve the built output locally
pnpm --filter @riebeckite/web deploy    # build and deploy to Cloudflare Workers
```

`pnpm build` builds `packages/cli` first, then builds `apps/web` for Cloudflare Workers. The build output goes to `apps/web/dist`, and the deployment settings live in `apps/web/wrangler.jsonc`.

## Validate the setup

Run the read-only commands from the repository root before investigating a problem:

```bash
pnpm exec riebeckite check      # validate configuration and plugin resolution
pnpm exec riebeckite doctor     # run read-only health checks
pnpm exec riebeckite inspect    # inspect the framework's resolved state
```

`check`, `doctor`, and `inspect` answer different questions and do not replace one another. The [CLI reference](./docs/en/cli.md) covers how to use them and how to automate them safely.

## Common commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the development server for the reference application |
| `pnpm build` | Build the CLI and the reference application |
| `pnpm exec riebeckite build --full` | Rebuild without incremental reuse |
| `pnpm exec riebeckite profile` | Produce a trace-based performance report |
| `pnpm --filter @riebeckite/web preview` | Serve the build output locally |
| `pnpm --filter @riebeckite/web deploy` | Deploy the reference application to Cloudflare Workers |
| `pnpm lint` / `pnpm format` / `pnpm check` | Run Biome lint, formatting, and fixes |

## Where to go next

Start with the [English documentation index](./docs/en/README.md). The most common entry points are:

1. [Fast path to publishing a site](./docs/en/quick-publish.md) for creating and deploying a new site as quickly as possible.
2. [Publishing Obsidian notes](./docs/en/obsidian-publishing.md) for using an Obsidian vault as site content.
3. [Writing content](./docs/en/writing-content.md) for frontmatter, Markdown, images, and drafts.
4. [Usage Guide](./docs/en/guide.md) for the full step-by-step flow from install to deployment.
5. [Configuration](./docs/en/configuration.md) for `riebeckite.config.ts`, content directories, and themes.

Individual plugins and themes are documented beside their packages (`packages/plugins/*/README.md`, `packages/themes/*/README.md`). Japanese readers can start from [README_ja.md](./README_ja.md) or the [Japanese documentation index](./docs/ja/README.md).

## Repository layout

| Path | Responsibility |
| --- | --- |
| [`packages/core`](./packages/core) | Content contracts, pipeline, plugin and theme APIs, diagnostics, and observability |
| [`packages/cli`](./packages/cli) | Node.js CLI and build-time tooling |
| [`packages/create-riebeckite`](./packages/create-riebeckite) | Scaffolds a new site (`npx create-riebeckite`) |
| [`packages/integrations/honox`](./packages/integrations/honox) | HonoX and Vite integration |
| [`packages/plugins`](./packages/plugins) | Reusable content, presentation, and publishing extensions |
| [`packages/themes`](./packages/themes) | Built-in CSS themes and token implementations |
| [`apps/web`](./apps/web) | Reference HonoX application |
| [`docs/en`](./docs/en/README.md) / [`docs/ja`](./docs/ja/README.md) | English and Japanese documentation |

Before changing Core, a plugin, an integration, or a theme, read [Repository Development](./docs/en/development.md) and the relevant guide. Keep Core free of framework- and package-specific reverse dependencies.
