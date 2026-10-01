<p align="center">
  <img src="./assets/logos/riebeckite-logo-horizontal.png" alt="Riebeckite" width="360" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@riebeckite/cli"><img src="https://img.shields.io/npm/v/%40riebeckite%2Fcli?label=npm" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@riebeckite/cli"><img src="https://img.shields.io/npm/dm/%40riebeckite%2Fcli" alt="npm downloads" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/Rerurate514/riebeckite" alt="License" /></a>
</p>

# Riebeckite

Riebeckite publishes Markdown and Obsidian-style notes as a fast static site. Start with the `starter` preset, write in `content/`, preview in a browser, build to `dist/`, and deploy when you are ready.

## Create a site

You do not need to clone this repository to use Riebeckite.

```bash
npx create-riebeckite my-site
cd my-site
npm install
npm exec riebeckite dev
```

Then edit Markdown in `content/`, confirm it in the browser, and build:

```bash
npm exec riebeckite build
```

Start here: [Getting Started](./docs/en/docs/getting-started/README.md).

## What Riebeckite includes

- Obsidian-flavored Markdown and content graph support
- Four self-contained presets. If you are unsure, use the default `starter` preset
- Plugin system for Markdown, rendering, discovery, media, diagnostics, and deployment features
- Theme system with official themes
- CLI commands for local preview, builds, and deeper diagnostics when needed
- Cloudflare Workers and GitHub Actions deployment templates
- Optional separate content repository workflows for advanced setups

## Documentation

- [Documentation home](./docs/en/README.md)
- [Presets](./docs/en/docs/getting-started/presets.md)
- [Guides](./docs/en/docs/guides/README.md)
- [Plugins](./docs/en/docs/plugins/README.md)
- [Themes](./docs/en/docs/themes/README.md)
- [Reference](./docs/en/docs/reference/README.md)
- [Framework development](./docs/en/docs/framework/development.md)
- [日本語 README](./README_ja.md)

## Developing Riebeckite itself

Clone this monorepo only when you are working on Riebeckite core, integrations, plugins, themes, or the reference app. Use [Framework Development](./docs/en/docs/framework/development.md) for repository setup and commands.

