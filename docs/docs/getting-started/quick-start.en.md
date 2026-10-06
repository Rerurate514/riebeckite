---
title: Quick Start
sidebar:
  label: Quick Start
  order: 10
---
# Quick Start

This is the shortest path from an empty folder to a working Riebeckite site. You do not need to know the framework internals first.

## Requirements

Brief requirements: [Installation](./installation.en.md#requirements). You need Node.js (LTS), a terminal, and about 5 minutes.

## 1. Create your site

Run the interactive generator:

```sh
npx create-riebeckite
```

Answer the prompts (recommended answers shown):

- **Project name** — press Enter for the default `my-site`
- **Preset** — keep `starter` when unsure; see [Presets](./presets.en.md)
- **Content source** — choose `This project` so Markdown stays inside the site
- **Deployment** — press Enter for `Not now` if you want a local project first. Choose `Cloudflare Workers` only when you want local publishing set up immediately. It installs dependencies and then asks `Deploy now?`: `Yes` publishes immediately, `Later` finishes the scaffold. Choose `GitHub Actions` to deploy on every push; see [Deployment](./deployment.en.md)

When it succeeds, it prints `Created a starter Riebeckite site in my-site` and a short "Next steps" list. The local-first default does not deploy or install packages; move into the folder and install them:

```sh
cd my-site
npm install
```

`npm install` installs the generated site's packages. The generated site is a single-repository project: the `@riebeckite/*` packages are published to npm, so this is all it takes.

The first files most people edit are `content/index.md` for content and `riebeckite.config.ts` for `site.title`, `site.baseUrl`, and `content.directory`.

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

A site generated with `Cloudflare Workers` already includes the Wrangler dependency and `wrangler.jsonc`, so no extra setup is needed. Build and publish:

```sh
npm run build
npm exec riebeckite deploy
```

Choosing `Yes` at `Deploy now?` runs the build and deploy immediately after scaffolding and prints a URL like `https://<name>.<account>.workers.dev`. If you chose `Later`, or you want to publish later updates, run the two commands above. The first run opens a browser to sign in to Wrangler. For a site generated with `Not now`, install Wrangler first with `npm install -D wrangler`.

After the public URL is known, set `site.baseUrl` in `riebeckite.config.ts` to that URL, then build and deploy once more so generated URLs such as sitemap entries use the final address.

```sh
npm exec riebeckite build
npm exec riebeckite deploy
```

To deploy automatically on every push, continue with GitHub Actions in [Deployment](./deployment.en.md). To keep content in a separate repository, see [Separate Content Repository →](../guides/content-repositories.en.md).

## Next

- [Deployment](./deployment.en.md) — publish to Cloudflare Workers and automate with GitHub Actions
- [Presets](./presets.en.md) — compare `starter`, `minimal`, `showcase`, and `empty`
- [First Content](./first-content.en.md) — write and preview content more deliberately
- [Installation](./installation.en.md) — requirements and setup deep-dive
- [Branding your site →](../guides/branding.en.md) — replace the icon, header logo, and link preview image
- [Obsidian Vault →](../guides/obsidian.en.md) — use an Obsidian vault as content source
- [Separate Content Repository →](../guides/content-repositories.en.md) — split content into a separate repo
