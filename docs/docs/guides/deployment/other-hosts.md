---
date: 2026-11-01
title: Deploy to other hosts
sidebar.label: Other hosts
sidebar.order: 50
---
# Deploy to other hosts

`riebeckite build` writes static files to `dist/`. Any host can serve that folder.

`deploy setup` is Cloudflare-specific. `riebeckite publish run` can deploy to Netlify and Vercel. GitHub Pages must be deployed by its own workflow.

## Generate host-specific files

The [Deploy plugin](../../plugins/deploy.md) writes the redirect and header files a host reads into `dist/`.

```ts
import { defineConfig } from "@riebeckite/core";
import { deploy } from "@riebeckite/plugin-deploy";

export default defineConfig({
  plugins: [
    deploy({
      provider: "netlify",
      headers: { "X-Frame-Options": "DENY" },
    }),
  ],
});
```

Set `provider` to one of the following.

| Host | `provider` | Generated files |
| --- | --- | --- |
| Cloudflare Pages | `cloudflare-pages` | `_redirects` (when redirects exist), `_headers` (when headers are configured) |
| Cloudflare Workers | `cloudflare-workers` | `_redirects` (when redirects exist), `_headers` (when headers are configured) |
| Netlify | `netlify` | `_redirects` (when redirects exist), `_headers` (when headers are configured) |
| Vercel | `vercel` | `vercel.json` |
| GitHub Pages | `github-pages` | `.nojekyll`, `404.html`, `CNAME` (when `cname` is set), HTML redirect stubs |

You can target several hosts at once. If two providers plan different content for the same path, the build fails.

Redirects come only from published entries, so unpublished notes never leak their old paths. See the [Deploy plugin](../../plugins/deploy.md) for the file formats.

## Netlify

1. Connect the repository to Netlify.
2. Set the build command to `npm run build` and the publish directory to `dist`.
3. Configure `deploy({ provider: "netlify" })` and build.

Netlify reads `_redirects` and `_headers` from `dist/`.

To deploy from the CLI, build and run:

```sh
npx netlify deploy --dir=dist --prod
```

## Vercel

1. Connect the repository to Vercel.
2. Set the build command to `npm run build` and the output directory to `dist`.
3. Configure `deploy({ provider: "vercel" })` and build.

The build writes `vercel.json` instead of requiring hand-written redirects. Use `trailingSlash` to choose how trailing slashes are handled.

## GitHub Pages

1. Configure `deploy({ provider: "github-pages", cname: "example.com" })`. Omit `cname` when you do not use a custom domain.
2. Run `npm run build`.
3. Push `dist/` to a publishing branch such as `gh-pages`, or publish it from GitHub Actions.

`dist/` contains `.nojekyll`, so the site is served without Jekyll processing. The build also writes `404.html` and one HTML redirect per redirect.

GitHub Pages does not understand `_redirects`. Redirects become HTML pages that use a meta refresh, and redirects from `/` are not generated.

## Publishing from CI

In CI, `deploy()` still only writes files, so the build step is followed by uploading `dist/` to the host. Keep credentials in repository secrets.

### GitHub Pages

Configure `deploy({ provider: "github-pages" })` and publish with this workflow:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - uses: actions/deploy-pages@v4
```

### Netlify

For hosts other than GitHub Pages, replace the steps after the build. With the Netlify CLI, add `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID` to repository secrets.

```yaml
      - run: npm ci
      - run: npm run build
      - run: npx netlify deploy --dir=dist --prod
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

### Vercel

The simplest setup for Vercel is its Git integration. Set the output directory to `dist` and generate `vercel.json` with `deploy({ provider: "vercel" })`.

## Common notes

- Set `site.baseUrl` to the public URL before building.
- `deploy()` only writes files. It does not upload, authenticate, or purge caches.
- Point the host's publish directory at `dist/`. Never publish `.riebeckite/` or plugin caches.
