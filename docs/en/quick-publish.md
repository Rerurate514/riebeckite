# Fast path to publishing a site

This guide is the shortest path from a new Riebeckite site to a published Cloudflare Workers site. You do not need to clone the Riebeckite repository.

## What you need first

- Node.js (LTS)
- A Cloudflare account
- A terminal (PowerShell on Windows, Terminal on macOS)

After installing Node.js, confirm that these commands work.

```sh
node -v
npm -v
```

If both commands print version numbers, you are ready.

## 1. Create a new site

In the folder where you want to create the site, run the following. Replace `my-site` with any name you like.

```sh
npx create-riebeckite my-site
cd my-site
npm install
```

If you are not sure which preset to choose, use the default `starter` preset. For a smaller site, add `--preset minimal`.

```sh
npx create-riebeckite my-site --preset minimal
```

## 2. Change the site information

Open `riebeckite.config.ts` and edit the `site` section.

```ts
site: {
  title: "My Blog",
  description: "Notes and writing",
  baseUrl: "https://example.com",
  locale: "en",
},
```

You can use a temporary `baseUrl` at first. After deployment, replace it with the real URL.

## 3. Write the first article

Create `content/first-post.md` with this content.

```md
---
title: First post
publish: true
---

# First post

This is my first Riebeckite article.
```

`title` and `publish: true` are required for a note you want to publish. Notes without `publish: true` stay out of the site.

## 4. Preview locally

```sh
npm exec riebeckite dev
```

Open the URL printed in the terminal, usually something like `http://localhost:5173`. Press `Ctrl + C` in the terminal to stop the server.

Before publishing, you can also run:

```sh
npm exec riebeckite check
npm exec riebeckite doctor
```

## 5. Build for publishing

```sh
npm exec riebeckite build
```

A successful build writes the publishable files to `dist/`.

## 6. Publish to Cloudflare Workers

Install wrangler.

```sh
npm install -D wrangler
```

Copy [`templates/cloudflare/wrangler.jsonc`](../../templates/cloudflare/wrangler.jsonc) from this repository into the site root. If you only have the generated site locally, copy the linked file contents into a new `wrangler.jsonc` file.

```text
my-site/
|- content/
|- dist/
|- package.json
|- riebeckite.config.ts
`- wrangler.jsonc
```

In `wrangler.jsonc`, change `name` to your own Worker name. Keep `assets.directory` as `./dist`.

Then log in and deploy.

```sh
npx wrangler login
npx wrangler deploy
```

Open the final URL printed by wrangler. If the site loads, deployment worked. Put that URL into `baseUrl`, then build and deploy once more so feeds and sitemaps use the correct URL.

```sh
npm exec riebeckite build
npx wrangler deploy
```

## Next steps

- [Writing content](./writing-content.md)
- [Publishing Obsidian notes](./obsidian-publishing.md)
- [Cloudflare Workers deployment](./cloudflare-deploy.md)
