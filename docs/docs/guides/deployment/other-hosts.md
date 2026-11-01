---
date: 2026-11-01
title: Deploy to other hosts
sidebar:
  label: Other hosts
  order: 50
---
# Deploy to other hosts

`riebeckite build` writes static files to `dist/`. Any host can serve that folder.

`riebeckite publish run` and `deploy setup` are Cloudflare-only. For other hosts, build `dist/` and upload it yourself.

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
| Cloudflare Pages | `cloudflare-pages` | `_redirects`, `_headers` |
| Cloudflare Workers | `cloudflare-workers` | `_redirects`, `_headers` |
| Netlify | `netlify` | `_redirects`, `_headers` |
| Vercel | `vercel` | `vercel.json` |
| GitHub Pages | `github-pages` | `.nojekyll`, `404.html`, `CNAME`, HTML redirect stubs |

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

## Common notes

- Set `site.baseUrl` to the public URL before building.
- `deploy()` only writes files. It does not upload, authenticate, or purge caches.
- Point the host's publish directory at `dist/`. Never publish `.riebeckite/` or plugin caches.
