# Cloudflare Workers deployment

This guide focuses only on publishing a Riebeckite site to Cloudflare Workers.

## Prerequisites

In the site folder, make sure these commands succeed.

```sh
npm install
npm exec riebeckite build
```

A successful build creates `dist/`. Cloudflare Workers will serve the files from that folder.

## 1. Create a Cloudflare account

Create an account at [cloudflare.com](https://www.cloudflare.com/). The free plan is enough to get started.

## 2. Install wrangler

Run this in the site folder.

```sh
npm install -D wrangler
```

wrangler is the official command-line tool for deploying to Cloudflare Workers.

## 3. Add wrangler.jsonc

Copy [`templates/cloudflare/wrangler.jsonc`](../../../../templates/cloudflare/wrangler.jsonc) from this repository into the site root. If you only have the generated site locally, copy the linked file contents into a new `wrangler.jsonc` file.

```text
my-site/
|- dist/
|- package.json
|- riebeckite.config.ts
`- wrangler.jsonc
```

Change `name` first.

```jsonc
{
  "name": "my-riebeckite-site",
  "assets": {
    "directory": "./dist"
  }
}
```

`name` is the Worker name on Cloudflare. Choose a name that is unique to you. Keep `assets.directory` as `./dist`.

## 4. Log in to Cloudflare

```sh
npx wrangler login
```

A browser window opens. Log in to Cloudflare and grant access.

## 5. Deploy

```sh
npx wrangler deploy
```

wrangler prints a URL such as `https://<name>.<account>.workers.dev`. Open it in a browser. If the site loads, deployment worked.

## 6. Match baseUrl to the deployed URL

After the first successful deploy, update `baseUrl` in `riebeckite.config.ts`.

```ts
site: {
  baseUrl: "https://my-riebeckite-site.example.workers.dev",
},
```

Then build and deploy again.

```sh
npm exec riebeckite build
npx wrangler deploy
```

This makes sitemap and feed URLs match the public site.

## Check without publishing

Use these commands if you want to verify before uploading.

```sh
npx wrangler deploy --dry-run
npx wrangler dev
```

`--dry-run` validates the configuration and files. `wrangler dev` serves a local version close to the deployed Worker.

## Automated deployment with GitHub Actions

Instead of running `npx wrangler deploy` manually, you can deploy when you push to GitHub.

See the [Cloudflare deployment template](../../../../templates/cloudflare/README_en.md) for the full workflow.

## Next steps

- [Fast path to publishing a site](../../getting-started/deployment.md)
- [Usage Guide](../README.md)
- [CLI](../../reference/cli.md)

