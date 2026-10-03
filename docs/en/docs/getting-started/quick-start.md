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

A successful build writes the publishable static output to `dist/`. Deployment means hosting that folder.

## 7. Publish to Cloudflare Workers

Publish your first version from the command line too. Install Wrangler, then run `deploy`:

```sh
npm install -D wrangler
npm exec riebeckite deploy
```

On the first run, Wrangler opens a browser to sign in. `riebeckite deploy` creates `wrangler.jsonc` from the folder name if it is missing, and publishes the built `dist/` to Cloudflare Workers. When it succeeds, it prints a URL like `https://<name>.<account>.workers.dev`; open it to confirm the site loads.

After the public URL is known, set `site.baseUrl` in `riebeckite.config.ts` to that URL, then build and deploy once more so generated URLs such as sitemap entries use the final address.

```sh
npm exec riebeckite build
npm exec riebeckite deploy
```

To deploy automatically on every push, continue with GitHub Actions in [Deployment](./deployment.md). To keep content in a separate repository, see [Separate Content Repository →](../guides/content-repositories.md).

## Next

- [Deployment](./deployment.md) — publish to Cloudflare Workers and automate with GitHub Actions
- [Presets](./presets.md) — compare `starter`, `minimal`, `showcase`, and `empty`
- [First Content](./first-content.md) — write and preview content more deliberately
- [Installation](./installation.md) — requirements and setup deep-dive
- [Obsidian Vault →](../guides/obsidian.md) — use an Obsidian vault as content source
- [Separate Content Repository →](../guides/content-repositories.md) — split content into a separate repo