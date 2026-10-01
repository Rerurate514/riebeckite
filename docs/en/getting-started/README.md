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

You do **not** clone this repository to use Riebeckite. The [`create-riebeckite`](https://www.npmjs.com/package/create-riebeckite) generator creates a self-contained site for you.

## Pages in this section

| Page | What you do |
| --- | --- |
| [Quick Start](./quick-start.md) | Create, run, edit Markdown, preview, and build in one short path |
| [Installation](./installation.md) | Check requirements and understand the generated files |
| [First Content](./first-content.md) | Write or edit your first published Markdown page |
| [Presets](./presets.md) | Compare `starter`, `minimal`, `showcase`, and `empty` |
| [Deployment](./deployment.md) | Deploy manually first, then automate with GitHub Actions |

## The shortest path

```sh
npx create-riebeckite my-site
cd my-site
npm install
npm exec riebeckite dev
```

Open the local URL printed in the terminal. Edit Markdown in `content/`, make sure published pages have `publish: true`, then build:

```sh
npm exec riebeckite build
```

If you are unsure which preset to choose, use the default `starter` preset.

> **Developing Riebeckite itself?** Start with [Framework / Development](../framework/development.md) instead.

## Next

- [Quick Start →](./quick-start.md)
