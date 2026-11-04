---
date: 2026-10-06
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

- **Project name** — press Enter for the default `my-riebeckite-site`
- **What would you like to build?** ([[glossary/preset|preset]]) — keep `Starter site` (the `starter` preset) when unsure. Choose `Blog` if you are publishing posts, tags, and series; see [Presets](./presets.md)
- **Add optional feature packs?** — press Enter for `No`
- **Customize extra project files?** — press Enter for `No`; the default project files are still generated
- **Where will you write content?** — choose `This project` so Markdown stays inside the site
- **Set up deployment?** — press Enter for `Not now` if you want a local project first. Choose `Cloudflare Workers` only when you want local publishing set up immediately. It installs dependencies and then asks `Deploy now?`: `Yes` publishes immediately, `Later` finishes the scaffold. Choose `GitHub Actions` to deploy on every push; see [Deployment](./deployment.md)
- **Install dependencies now?** — press Enter for `Yes` so the generator installs the site's packages

When it succeeds, it prints `Created a starter Riebeckite site in my-riebeckite-site` and a short "Next steps" list. If you kept the default install answer, the packages are already installed; move into the folder:

```sh
cd my-riebeckite-site
```

If you chose `No`, run `npm install` in that folder before continuing. `npm install` installs the generated site's packages. The generated site is a single-repository project: the `@riebeckite/*` packages are published to npm, so this is all it takes.

The first files most people edit are `content/index.md` for content and `riebeckite.config.ts` for `site.title`, `site.baseUrl`, and `content.directory`.

## 2. Start development

First validate the generated configuration:

```sh
npm exec riebeckite check
```

Then start the development server:

```sh
npm exec riebeckite dev
```

The development server is started by the generated app. **Open the local URL printed in your terminal.** If the Riebeckite site appears in the browser, this step is working. The dev server reads `content/` and does not create `dist/`; the build output appears only after `build`. If it does not start, run `npm exec riebeckite doctor`.

Keep the command running while you edit. Press `Ctrl + C` when you want to stop it.

On Windows, save related edits together and wait for the server to finish restarting before reloading. Saving several files in quick succession can restart the Vite server repeatedly and briefly show `transport was disconnected`; reload after the restart to clear it.

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

Add `[[hello]]` (Obsidian [[glossary/wikilink|WikiLink]]) to `content/index.md`. The starter preset enables `@riebeckite/plugin-obsidian-markdown`; the generated content itself uses `[[guide]]`, `[[examples]]`. Click through to verify the link works.

## 6. Build the site

```sh
npm exec riebeckite build
```

A successful build writes the publishable static output to `dist/`. Deployment means hosting that folder.

## 7. Publish to Cloudflare Workers

A site generated with `Cloudflare Workers` already includes the Wrangler dependency and `wrangler.jsonc`, so no extra setup is needed. Build and publish:

```sh
npm exec riebeckite build
npm exec -- riebeckite publish run --execute
```

Choosing `Yes` at `Deploy now?` runs the build and deploy immediately after scaffolding and prints a URL like `https://<name>.<account>.workers.dev`. If you chose `Later`, or you want to publish later updates, run these commands:

```sh
npm exec riebeckite build
npm exec -- riebeckite publish run --execute
```
The first run opens a browser to sign in to Wrangler. For a site generated with `Not now`, install Wrangler first with `npm install -D wrangler`.

After the public URL is known, set `site.baseUrl` in `riebeckite.config.ts` to that URL, then build and deploy once more so generated URLs such as sitemap entries use the final address. The publication plan only tracks content, so a config-only change needs `--force` to deploy.

```sh
npm exec riebeckite build
npm exec -- riebeckite publish run --execute --force
```

To deploy automatically on every push, continue with GitHub Actions in [Deployment](./deployment.md). To keep content in a separate repository, see [Separate Content Repository →](../guides/content-repositories.md).

## Next

- [Deployment](./deployment.md) — publish to Cloudflare Workers and automate with GitHub Actions
- [Presets](./presets.md) — compare `starter`, `blog`, `docs`, `minimal`, `showcase`, and `empty`
- [First Content](./first-content.md) — write and preview content more deliberately
- [Installation](./installation.md) — requirements and setup deep-dive
- [Branding your site →](../guides/branding.md) — replace the icon, header logo, and link preview image
- [Obsidian Vault →](../guides/obsidian.md) — use an Obsidian vault as content source
- [Separate Content Repository →](../guides/content-repositories.md) — split content into a separate repo
