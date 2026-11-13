---
date: 2026-10-06
title: Getting Started
sidebar.label: Getting Started
sidebar.order: 10
---
# Getting Started

This section is the beginner path for publishing your first Riebeckite site. Follow it in order; advanced diagnostics, plugin development, and separate repositories are linked only when you need them.

```text
Quick Start
    ↓
Installation
    ↓
First Content
    ↓
Presets
    ↓
Deployment
```

## What is Riebeckite?

Riebeckite turns Markdown, including Obsidian-style notes, into a fast static site. You write Markdown in `content/`, run a local preview, build the output into `dist/`, and deploy that folder.

The [Design Philosophy](../philosophy.md) explains why Riebeckite makes these choices. You do not need it to finish this chapter.

You do **not** clone this repository to use Riebeckite. The [`create-riebeckite`](https://www.npmjs.com/package/create-riebeckite) generator creates a self-contained site for you.

## Pages in this section

| Page | What you do |
| --- | --- |
| [Quick Start](./quick-start.md) | Create, run, edit Markdown, preview, and build in one short path |
| [Installation](./installation.md) | Check requirements and understand the generated files |
| [First Content](./first-content.md) | Write or edit your first published Markdown page |
| [Presets](./presets.md) | Compare presets such as `starter`, `blog`, `docs`, and `minimal` |
| [Deployment](./deployment.md) | Publish locally, then automate with GitHub Actions if needed |
| [Use Your Obsidian Vault](./obsidian-vault.md) | Connect an existing Obsidian Vault and publish selected notes |
| [Add Your First Plugin](./first-plugin.md) | Install a plugin and see `==highlight==` syntax work |
| [Change Your Theme](./first-theme.md) | Swap the theme and see the design change |

Quick Start is the shortest path to a running site; Installation covers requirements and generated files in detail. The three setup walkthroughs — [Integrated Setup](./integrated-setup.md), [Separate Directories Setup](./separate-directories-setup.md), [Separate Repositories Setup](./separate-repositories-setup.md) — add deployment for each layout.

## The shortest path

```sh
npx create-riebeckite
```

The CLI asks for the project name, preset, optional feature packs, extra project files, content source, deployment, and whether to install dependencies. The default project folder is `my-riebeckite-site`. Keep `Starter site` (the `starter` preset), no optional feature packs, no extra project file changes, `This project`, `Not now`, and the default install answer (`Yes`) to start locally, then:

```sh
cd my-riebeckite-site
npm exec riebeckite check
npm exec riebeckite dev
```

If you answered `No` to the install prompt, run `npm install` in the folder first.

Open the local URL printed in the terminal. Edit Markdown in `content/`, make sure published pages have `publish: true`, then build:

```sh
npm exec riebeckite build
```

To publish the build output as-is, install Wrangler and run `npm exec -- riebeckite publish run --execute`. If the site has no Wrangler configuration yet, add `--provider cloudflare-workers`; login and `wrangler.jsonc` generation are then automatic. See [Deployment](./deployment.md) for details.

If you are unsure which preset to choose, use the `starter` preset. For a publication with posts, tags, and series, choose `blog` at the preset prompt, or run `npx create-riebeckite my-blog --preset blog`.

> **Developing Riebeckite itself?** Start with [Framework / Development](../framework/development.md) instead.

## Customize Riebeckite

| Goal | Guide |
| --- | --- |
| Already use Obsidian | [Use Your Obsidian Vault](./obsidian-vault.md) |
| Add features (search, diagrams, embeds…) | [Add Your First Plugin](./first-plugin.md) |
| Change appearance (colors, fonts, layout…) | [Change Your Theme](./first-theme.md) |
| Replace the icon, logo, or link preview image | [Branding your site](../guides/branding.md) |

## Next

- [Quick Start →](./quick-start.md)
