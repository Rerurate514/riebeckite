# Deployment guide

Use this guide for static hosting, CI publishing, and external content repositories.

## Identify the deployment contract

Record:

- Provider and project/account.
- Build command and output directory.
- Public origin and base path.
- Content source: site repository, external repository, or both.
- Environment variables and secret names.
- Preview and production URLs.
- Rollback target.

The generated project usually builds to `dist/` and deploys that directory. Do not invent a different output path without checking the provider configuration.

## Cloudflare Workers

Typical setup:

```jsonc
{
  "name": "my-site",
  "compatibility_date": "2026-01-01",
  "assets": { "directory": "./dist" }
}
```

Commands:

```sh
npx wrangler login
npm run build
npm exec -- riebeckite publish run --execute
```

Set `site.baseUrl` to the deployed origin after the first deployment. Build-time `.riebeckite/` state is not published.

## GitHub Actions

The generated workflow builds the site and deploys the static output. `npm exec riebeckite deploy setup` can detect the GitHub remote and create the workflow when it is absent. It requires `gh` and a GitHub repository.

It registers:

- `CLOUDFLARE_API_TOKEN` as a repository secret.
- `CLOUDFLARE_ACCOUNT_ID` as a repository variable.

The workflow expects a lockfile for `npm ci` and falls back to `npm install` when needed. Commit the lockfile. Push to the configured branch to deploy.

## External content repository

When content lives in a separate repository:

- The workflow checks out the content repository into the configured `content.directory` before building.
- A private content repository needs a read token available to CI.
- The content repository can dispatch a content-updated event; the site workflow rebuilds.
- `content.directory` must match the checkout path.
- `exclude` should omit editor state and private folders, for example `.obsidian/**` and templates.
- Keep content commits in the content repository and site commits in the site repository.

## URLs and caching

Preserve:

- Base path and trailing-slash behaviour.
- Locale and default-language routes.
- Redirects and aliases.
- Canonical and alternate URLs.
- Asset fingerprints and public paths.
- Feed, sitemap, and search output.
- Cache headers and invalidation behaviour.

A deployment is not verified until a deep link, an asset, and a redirect work from the public origin.

## Verification

```sh
npm run check
npm run build
npm exec riebeckite inspect content --list
npm exec riebeckite inspect graph
```

After deployment, check:

- The home page and one deep content route.
- A renamed or redirected URL.
- CSS, JavaScript, images, and fonts.
- Feed and sitemap.
- A locale route when the site is multilingual.
- The private-content boundary: unpublished pages must not be reachable.

## Rollback

Keep the previous provider deployment, artifact, or revision. If the public site is wrong, restore that target first, then diagnose locally. Do not debug production by repeatedly deploying unrelated changes.

## Report

State the provider, build/output, public origin, content source, secret names, commands run, verification URLs, and rollback target.
