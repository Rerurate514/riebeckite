# Deployment

Riebeckite builds a **static site**: `riebeckite build` renders every page into `dist/`, and deployment means hosting that folder. The reference target is [Cloudflare Workers](https://workers.cloudflare.com/) with static assets, but any static host works.

This page is the shortest deployment path. For automation and separate repositories, see [Guides / Deployment](../guides/deployment/README.md).

## Option A — deploy from your machine

1. Create a [Cloudflare account](https://www.cloudflare.com/).

2. In the site folder, install Wrangler (Cloudflare's CLI):

   ```sh
   npm install -D wrangler
   ```

3. Create `wrangler.jsonc` in the site root:

   ```jsonc
   {
     "name": "my-site",
     "compatibility_date": "2026-03-10",
     "compatibility_flags": ["nodejs_compat"],
     "assets": { "directory": "./dist" }
   }
   ```

   Change `name` to a Worker name unique to you. Keep `assets.directory` as `./dist`, which is where `riebeckite build` writes.

4. Build, log in, and deploy:

   ```sh
   npm exec riebeckite build
   npx wrangler login
   npx wrangler deploy
   ```

5. Open the URL printed at the end (`https://<name>.<account>.workers.dev`). After the site loads, put that URL into `site.baseUrl` in `riebeckite.config.ts`, then build and deploy once more so the sitemap and feeds use the real address.

You can validate without uploading:

```sh
npx wrangler deploy --dry-run   # check the config and files only
npx wrangler dev                # serve the built output locally
```

## Option B — deploy on every push with GitHub Actions

Generate the site with the actions option and the workflow is written for you:

```sh
npx create-riebeckite my-site --preset starter --github-actions
```

This adds `wrangler.jsonc` and `.github/workflows/deploy.yml` to the generated site. Add these repository secrets in GitHub (Settings → Secrets and variables → Actions), then push to `main` or run the workflow from the Actions tab:

- `CLOUDFLARE_API_TOKEN` — create it in Cloudflare with the **Workers Scripts: Edit** permission
- `CLOUDFLARE_ACCOUNT_ID`

The generated workflow installs with `npm ci`, so commit the `package-lock.json` created by your first `npm install`.

Full workflow details, the separate content-repository setup, triggers, and authentication are documented under [Guides / Deployment](../guides/deployment/README.md).

## What deployment does not require

Riebeckite pre-renders content routes and plugin endpoints, so the Worker only serves static assets. There is no runtime `main` entry and no server-side program to operate.

Page-view tracking is optional and separate: it is a second Worker. See [Analytics](../guides/analytics.md) when you want it.

## Next

- [Guides →](../guides/README.md) — writing content, Obsidian, content repositories, localization, deployment in depth
