# Riebeckite

Riebeckite is a framework for publishing Markdown and Obsidian-style content as a fast static site. It provides a content pipeline, plugins, themes, HonoX integration, diagnostics, and Cloudflare Workers deployment support.

## Create a site

You do not need to clone this repository to use Riebeckite.

```bash
npx create-riebeckite my-site
cd my-site
npm install
npm exec riebeckite check
npm exec riebeckite dev
```

Then write Markdown in `content/`, preview locally, build, and deploy:

```bash
npm exec riebeckite build
```

Start here: [Getting Started](./docs/en/getting-started/README.md).

## What Riebeckite includes

- Obsidian-flavored Markdown and content graph support
- Four self-contained presets: `starter`, `minimal`, `showcase`, and `empty`
- Plugin system for Markdown, rendering, discovery, media, diagnostics, and deployment features
- Theme system with official themes and CSS tokens
- CLI commands for `check`, `doctor`, `inspect`, `dev`, `build`, and `profile`
- Cloudflare Workers and GitHub Actions deployment templates
- Optional same-repository or separate content repository workflows

## Documentation

- [Documentation home](./docs/en/README.md)
- [Presets](./docs/en/getting-started/presets.md)
- [Guides](./docs/en/guides/README.md)
- [Plugins](./docs/en/plugins/README.md)
- [Themes](./docs/en/themes/README.md)
- [Reference](./docs/en/reference/README.md)
- [Framework development](./docs/en/framework/development.md)
- [日本語 README](./README_ja.md)

## Developing Riebeckite itself

Clone this monorepo only when you are working on Riebeckite core, integrations, plugins, themes, or the reference app. Use [Framework Development](./docs/en/framework/development.md) for repository setup and commands.
