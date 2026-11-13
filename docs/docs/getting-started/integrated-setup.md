---
date: 2026-11-05
title: Integrated Setup
sidebar.label: Integrated Setup
sidebar.order: 22
---
# Integrated Setup

The integrated layout keeps `content/` and the site code in one repository. It is the default and the least error-prone choice.

Official sample: [Rerurate514/riebeckite-e2e-integrated](https://github.com/Rerurate514/riebeckite-e2e-integrated) — [integrated.riebeckite.dev](https://integrated.riebeckite.dev)

## 1. Create the project

```sh
npx create-riebeckite my-site --preset starter --github-actions
cd my-site
npm install
```

`--github-actions` creates `wrangler.jsonc` and `.github/workflows/publish.yml`. `npm install` creates `package-lock.json`, which the workflow uses when it is present.

## 2. Name the Worker and set the domain

Edit `wrangler.jsonc`:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "my-site",
  "compatibility_date": "2026-06-09",
  "compatibility_flags": ["nodejs_compat"],
  "assets": { "directory": "./dist" },
  "routes": [{ "pattern": "my-site.example.com", "custom_domain": true }]
}
```

Keep `compatibility_flags` and `assets` when you edit the file; an assets-only Worker needs them.

The Worker name must be unique in the Cloudflare account. A custom domain creates its DNS record automatically; do not add a separate DNS record for the same hostname.

Set the public URL in `riebeckite.config.ts`:

```ts
site: {
  title: "My site",
  baseUrl: "https://my-site.example.com",
},
```

## 3. Run locally

```sh
npm exec riebeckite check
npm exec riebeckite dev
```

Open the URL printed by the dev server. Edit `content/index.md` and confirm the page updates.

## 4. Build

```sh
npm exec riebeckite build
```

The static site is written to `dist/`. Commit `package-lock.json`, but not `dist/` or `node_modules/`.

## 5. Deploy

For a first manual deploy, install Wrangler first because `--github-actions` does not add it to the project:

```sh
npm install -D wrangler
npm exec -- riebeckite publish run --execute
```

The first run opens the Cloudflare login flow. For automatic deploys, add these to the GitHub repository:

- Secret `CLOUDFLARE_API_TOKEN` with Account **Workers Scripts:Edit**, Zone **Workers Routes:Edit**, and Zone **Zone:Read**.
- Variable `CLOUDFLARE_ACCOUNT_ID` with the Cloudflare account ID.

The generated workflow deploys on every push to `main`. See [Cloudflare Workers](../guides/deployment/cloudflare-workers.md) and [GitHub Actions](../guides/deployment/github-actions.md) for the full setup.

## 6. Verify

```sh
curl -I https://my-site.example.com/
curl -I https://my-site.example.com/notes/writing
```

Check the HTML, CSS, images, 404 page, `sitemap.xml`, and `robots.txt`. A missing custom domain usually means the route was not deployed or the hostname is already used by another Worker.

## Common mistakes

- Running `npm exec riebeckite ...` from outside the site folder. Run commands from the site root.
- Adding pages without `publish: true`. New notes stay drafts and do not appear in the built site.
- Editing `dist/` directly. `dist/` is rebuilt from `content/` and `app/` on every build; edit the source files instead.
- Committing `dist/` or `node_modules/`. Commit `package-lock.json` instead.
- Changing `site.baseUrl` after deploying without rebuilding. Sitemap and feed URLs use the configured `baseUrl`, so rebuild and redeploy after changing it.

## Next

- [Content Location](./content-location.md)
- [Separate Directories Setup](./separate-directories-setup.md)
- [Separate Repositories Setup](./separate-repositories-setup.md)
