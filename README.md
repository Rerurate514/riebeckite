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
npx create-riebeckite
```

Follow the prompts (project name, preset, content source, deployment), then:

```bash
cd my-site
npm install
npm exec riebeckite dev
```

Use the folder name you entered instead of `my-site`, and keep the `starter`
preset unless you know you want another one. Passing an argument, such as
`npx create-riebeckite my-site`, skips the prompts.

Then edit Markdown in `content/`, confirm it in the browser, and build:

```bash
npm exec riebeckite build
```

Start here: [Getting Started](./docs/docs/getting-started/README.en.md).

## What Riebeckite includes

- Obsidian-flavored Markdown and content graph support
- Four self-contained presets. If you are unsure, use the default `starter` preset
- Plugin system for Markdown, rendering, discovery, media, diagnostics, and deployment features
- Theme system with official themes
- CLI commands for local preview, builds, and deeper diagnostics when needed
- Cloudflare Workers and GitHub Actions deployment templates
- Optional separate content repository workflows for advanced setups

## Documentation

- [Documentation home](./docs/README.en.md)
- [Presets](./docs/docs/getting-started/presets.en.md)
- [Guides](./docs/docs/guides/README.en.md)
- [Plugins](./docs/docs/plugins/README.en.md)
- [Themes](./docs/docs/themes/README.en.md)
- [Reference](./docs/docs/reference/README.en.md)
- [Framework development](./docs/docs/framework/development.en.md)
- [日本語 README](./README_ja.md)

## Developing Riebeckite itself

Clone this monorepo only when you are working on Riebeckite core, integrations, plugins, themes, or the reference app. Use [Framework Development](./docs/docs/framework/development.en.md) for repository setup and commands.

