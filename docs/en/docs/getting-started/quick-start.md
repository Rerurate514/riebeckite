---
title: Quick Start
sidebar:
  label: Quick Start
  order: 10
---
# Quick Start

This is the shortest path from an empty folder to a working Riebeckite site. You do not need to know the framework internals first.

## Requirements

Brief requirements: [Installation](./installation.md#requirements). You need Node.js (LTS), a terminal, and about 5 minutes.

## 1. Create your site

Run the interactive generator:

```sh
npx create-riebeckite
```

Answer the prompts (recommended answers shown):

- **Project name** — press Enter for the default `my-site`
- **Preset** — keep `starter` when unsure; see [Presets](./presets.md)
- **Content source** — choose `This project` so Markdown stays inside the site
- **Deployment** — choose `Not now` for local development; you can add it later, see [Deployment](./deployment.md)

When it succeeds, it prints `Created a starter Riebeckite site in my-site` and a short "Next steps" list. Move into the folder and install the packages:

```sh
cd my-site
npm install
```

`npm install` installs the generated site's packages. The generated site is a single-repository project: the `@riebeckite/*` packages are published to npm, so this is all it takes.

## 2. Start development

```sh
npm exec riebeckite dev
```

The development server is started by the generated app. **Open the local URL printed in your terminal.** If the Riebeckite site appears in the browser, this step is working.

Keep the command running while you edit. Press `Ctrl + C` when you want to stop it.

## 3. Edit the first page

Edit `content/index.md`. For example, change the heading to `# My Digital Garden`. Save the file and watch the browser update.

## 4. Create another page

Create `content/hello.md` with exactly this frontmatter:

```md
---
publish: true
---

# Hello

This is my second page.
```

Served at `/hello`.

## 5. Link the pages

Add `[[hello]]` (Obsidian WikiLink) to `content/index.md`. The starter preset enables `@riebeckite/plugin-obsidian-markdown`; the generated content itself uses `[[guide]]`, `[[examples]]`. Click through to verify the link works.

## 6. Build the site

```sh
npm exec riebeckite build
```

A successful build writes the publishable static output to `dist/`. This is the folder you deploy. Do not introduce Cloudflare or GitHub Actions here.

## Next

- [Presets](./presets.md) — compare `starter`, `minimal`, `showcase`, and `empty`
- [First Content](./first-content.md) — write and preview content more deliberately
- [Installation](./installation.md) — requirements and setup deep-dive
- [Obsidian Vault →](../guides/obsidian.md) — use an Obsidian vault as content source
- [Separate Content Repository →](../guides/content-repositories.md) — split content into a separate repo