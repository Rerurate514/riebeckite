# Getting Started

This is the official starting point for anyone who wants to build a site with Riebeckite. Follow it in order and you will go from an empty machine to a published site.

```text
What Riebeckite is          (this page)
        ↓
Requirements                → installation.md
        ↓
create-riebeckite           → installation.md
        ↓
Choose a preset             → presets.md
        ↓
Write your first content    → first-content.md
        ↓
Preview locally             → installation.md
        ↓
Build                       → first-content.md
        ↓
Deploy                      → deployment.md
```

## What is Riebeckite?

Riebeckite turns a folder of Markdown — including Obsidian vaults — into a static site. You describe the site in one config file (`riebeckite.config.ts`), and Riebeckite renders every page with HonoX and Vite. Plugins add capabilities such as WikiLinks, Mermaid diagrams, search, SEO, and standalone pages; themes change how the site looks. You do not need to configure routes for built-in plugin pages.

You do **not** clone or install the Riebeckite repository to use it. A generator, [`create-riebeckite`](https://www.npmjs.com/package/create-riebeckite), writes a self-contained site for you.

## Pages in this section

| Page | What you do |
| --- | --- |
| [Installation](./installation.md) | Check your environment and generate a site |
| [Presets](./presets.md) | Choose the composition that matches your goal |
| [First content](./first-content.md) | Write and preview your first article, then build |
| [Deployment](./deployment.md) | Put the built site online |

## The whole path in one block

If you already know you want the default setup, this is the complete sequence. Each command is explained on the linked pages.

```sh
# 1. Create a site (pick a preset if you like)
npx create-riebeckite my-site
cd my-site
npm install

# 2. Configure site.title, site.baseUrl, and site.locale in riebeckite.config.ts
#    Write content/first-post.md

# 3. Preview locally
npm exec riebeckite dev

# 4. Build the publishable output
npm exec riebeckite build

# 5. Deploy (Cloudflare Workers)
npm install -D wrangler
npx wrangler login
npx wrangler deploy
```

> **Already using the Riebeckite repository?** If your goal is to develop Riebeckite itself, not to build a site, start with [Framework / Development](../framework/development.md) instead.

## Next

- [Installation →](./installation.md)
