# Cloudflare Workers deployment

This guide focuses only on publishing a Riebeckite site to Cloudflare Workers.

## Prerequisites

In the site folder, make sure these commands succeed.

```sh
npm install
npm exec riebeckite build
```

A successful build creates `dist/`. Cloudflare Workers will serve the files from that folder.

Incremental processing happens during `riebeckite build` on your machine or GitHub Actions runner. Wrangler then uploads the newly generated `dist/` as Workers Static Assets; Workers do not perform incremental builds. The generated GitHub Actions workflow persists `.riebeckite/cache` and `.riebeckite/build/content-state.json` for this build step, never `dist/`.

## 1. Create a Cloudflare account

Create an account at [cloudflare.com](https://www.cloudflare.com/). The free plan is enough to get started.

## 2. Get wrangler

A site generated with `create-riebeckite`'s `Cloudflare Workers` choice already includes the Wrangler dependency and `wrangler.jsonc`, so no extra install or setup is needed.

For a site generated with `Not now`, or when preparing one manually, run this in the site folder:

```sh
npm install -D wrangler
```

wrangler is the official command-line tool for deploying to Cloudflare Workers.

## 3. Add wrangler.jsonc

`npm exec riebeckite deploy` creates `wrangler.jsonc` from the site folder name when the file is missing, so this step is only needed when you want to review or customize it. To create it yourself, add a `wrangler.jsonc` in the site root:

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

`riebeckite deploy` opens the browser and asks you to log in on the first run. To log in ahead of time, or if you run Wrangler directly, use:

```sh
npx wrangler login
```

A browser window opens. Log in to Cloudflare and grant access.

## 5. Deploy

```sh
npm exec riebeckite deploy
```

`riebeckite deploy` calls Wrangler to publish `dist/`. It logs you in first when needed and creates `wrangler.jsonc` when it is missing. Choosing `Cloudflare Workers` in `create-riebeckite` and answering `Yes` to `Deploy now?` runs this build and deploy immediately after scaffolding. To run Wrangler directly instead, use `npx wrangler deploy`.

The deploy prints a URL such as `https://<name>.<account>.workers.dev`. Open it in a browser. If the site loads, deployment worked.

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
npm exec riebeckite deploy
```

This makes sitemap and feed URLs match the public site.

## Check without publishing

Use these commands if you want to verify before uploading.

```sh
npm exec -- riebeckite deploy --dry-run
npx wrangler dev
```

`--dry-run` validates the configuration and files. `wrangler dev` serves a local version close to the deployed Worker.

## Automated deployment with GitHub Actions

Instead of running `npm exec riebeckite deploy` manually, you can deploy when you push to GitHub.

If the site is already published from your machine, promote it from the site folder:

```sh
npm exec riebeckite deploy setup
```

This creates `.github/workflows/deploy.yml` and registers `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as repository secrets, then waits for you to push.

For a same-repository site that is not published yet, generate the workflow with:

```sh
npx create-riebeckite my-site --github-actions
```

For a separate content repository, generate both workflow files with:

```sh
npx create-riebeckite my-site --github-actions \
  --content-repository OWNER/notes \
  --site-repository OWNER/my-site
```

The external form checks out `OWNER/notes` into `content/`, receives
`content-updated` repository dispatch events, and writes `github/notify-site.yml`
for the content repository. Copy that file to
`.github/workflows/notify-site.yml` in the content repository. An external
checkout alone does not start the site workflow on a content push.

See [GitHub Actions](./github-actions.en.md) for the full workflow.

## Next steps

- [Fast path to publishing a site](../../getting-started/deployment.en.md)
- [Usage Guide](../README.en.md)
- [CLI](../../reference/cli.en.md)
