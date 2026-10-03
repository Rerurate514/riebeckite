# Deployment

A Riebeckite build produces static files in `dist/`. Deployment means serving that folder, and the choices are about *how* it gets there.

| I want to… | Guide |
| --- | --- |
| Deploy to Cloudflare Workers by hand | [Cloudflare Workers](./cloudflare-workers.md) |
| Deploy automatically from GitHub | [GitHub Actions](./github-actions.md) |
| Read articles from a separate repository in CI | [Separate content repository](./separate-content-repository.md) |
| Just get a site online today | [Getting Started / Deployment](../../getting-started/deployment.md) |

Publishing locally is the quickest first step: `npm exec riebeckite deploy` builds the site, creates `wrangler.jsonc` when it is missing, opens the Wrangler login on the first run, and uploads `dist/`. GitHub Actions and repository separation are options you can add later.

## Choosing a method

| Method | Deploy on article push | Needs secrets |
| --- | ---: | --- |
| Same repository + `push` | Yes | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` |
| Separate repository + `repository_dispatch` | Yes | Above + `SITE_DISPATCH_TOKEN` (content repo) and, if private, `RIEBECKITE_CONTENT_READ_TOKEN` (site repo) |
| Separate repository + `schedule` | Delayed | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` |
| Manual dispatch | No | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` |
| Local, from your machine (`npm exec riebeckite deploy`) | No | None (Wrangler OAuth) |

## What the build produces

Riebeckite pre-renders content routes and plugin endpoints during the build. The generated `dist/` is therefore deployed as **static assets**, with no runtime `main` entry.

Build state (`.riebeckite/`, plugin caches) stays at build time and never reaches the Worker runtime.

## See also

- [Cloudflare deployment template](../../../../../templates/cloudflare/README_en.md) — the files this section documents
- [Build system](../../framework/build-system.md) — what `riebeckite build` writes
- [Analytics](../../guides/analytics.md) — the optional, separate page-view collector



