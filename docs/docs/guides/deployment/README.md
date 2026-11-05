---
date: 2026-10-06
title: Deployment
---
# Deployment

A Riebeckite build produces static files in `dist/`. Deployment means serving that folder, and the choices are about *how* it gets there.

```mermaid
flowchart LR
    Source["Content / Config"]
    Build["riebeckite build"]
    Dist["dist/"]
    Workers["Cloudflare Workers"]
    Site["Public site"]

    Source --> Build
    Build --> Dist
    Dist --> Workers
    Workers --> Site
```

Running

```sh
npm exec riebeckite build
```

generates the publishable site into `dist/`. For a normal static site, that `dist/` is served from Cloudflare Workers as Static Assets.

| I want to… | Guide |
| --- | --- |
| Deploy to Cloudflare Workers by hand | [Cloudflare Workers](./cloudflare-workers.md) |
| Deploy automatically from GitHub | [GitHub Actions](./github-actions.md) |
| Plan, schedule, approve, and validate publications | [Publication workflow](./publication-workflow.md) |
| Read articles from a separate repository in CI | [Separate content repository](./separate-content-repository.md) |
| Deploy to Netlify, Vercel, or GitHub Pages | [Other hosts](./other-hosts.md) |
| Just get a site online today | [Getting Started / Deployment](../../getting-started/deployment.md) |

Publishing locally is the quickest first step: generate a site with `create-riebeckite`'s `Cloudflare Workers` choice, then run `npm exec -- riebeckite publish run --execute`. It plans, builds when needed, creates `wrangler.jsonc` when missing, opens the Wrangler login on the first run, and uploads the validated `dist/`. For a site without a Wrangler configuration, add `--provider cloudflare-workers`. GitHub Actions and repository separation are options you can add later. If you already published locally, `npm exec riebeckite deploy setup` prepares the publish workflow, including the two repository secrets.

```mermaid
flowchart TD
    Start["I want to publish a site"]
    Auto{"Deploy automatically?"}
    Separate{"Content in a<br/>separate repository?"}

    Start --> Auto
    Auto -->|"No"| Workers["Cloudflare Workers"]
    Auto -->|"Yes"| Separate
    Separate -->|"No"| Actions["GitHub Actions"]
    Separate -->|"Yes"| Content["Separate Content Repository"]
```

## Choosing a method

| Method | Deploy on article push | Needs secrets |
| --- | ---: | --- |
| Same repository + `push` | Yes | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` |
| Separate repository + `repository_dispatch` | Yes | Above + GitHub App secrets (or `SITE_DISPATCH_TOKEN`) in the content repo, and `RIEBECKITE_CONTENT_READ_TOKEN` in the site repo if private |
| Separate repository + `schedule` | Delayed | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and, if private, `RIEBECKITE_CONTENT_READ_TOKEN` (site repo) |
| Manual dispatch | No | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` |
| Local, from your machine (`npm exec -- riebeckite publish run --execute`) | No | None for Cloudflare Workers (Wrangler OAuth); Netlify needs `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID`, Vercel needs `VERCEL_TOKEN` |

## What the build produces

Riebeckite pre-renders content routes and GET plugin endpoint responses during the build. The generated `dist/` is therefore deployed as **static assets**, with no runtime `main` entry. Endpoints that need `POST`, such as a Webmention receiver, are not served by a static-only Worker and need a runtime Worker or server with a `main` entry.

Build state (`.riebeckite/`, plugin caches) stays at build time and never reaches the Worker runtime.

In Riebeckite, Build and Deploy are separate steps:

```text
Build
  → generate dist/ from content and configuration

Deploy
  → serve dist/ from Cloudflare Workers
```

The publish target is `dist/`:

```text
dist/
  → published

.riebeckite/
Plugin cache
  → not published
```

A normal static site does not need a runtime `main` either. The Riebeckite build does not run on Workers; the built `dist/` is served.

## Checking before you deploy

Before deploying, you can verify in this order:

```sh
npm exec riebeckite check
npm exec riebeckite doctor
npm exec riebeckite build
```

Once `build` succeeds, deploy the generated `dist/`.

## Deployment guides

### Cloudflare Workers

[Cloudflare Workers](./cloudflare-workers.md)

Publishing `dist/` to Cloudflare Workers from your machine. `npm exec -- riebeckite publish run --execute` handles the login and generates `wrangler.jsonc`; add `--provider cloudflare-workers` when the site has no Wrangler configuration.

### GitHub Actions

[GitHub Actions](./github-actions.md)

Automating the build and the Cloudflare Workers deployment on a push to the site repository.

### Separate Content Repository

[Separate content repository](./separate-content-repository.md)

Managing content such as an Obsidian vault and the site in separate repositories. This also covers authentication for a private content repository and starting the site deployment from a content update.

### Other hosts

[Other hosts](./other-hosts.md)

How to serve `dist/` from Netlify, Vercel, or GitHub Pages, and which files the Deploy plugin generates.

## Rolling back a published site

If something is wrong with the published site, return to a known-good commit and build and publish again.

1. Find the commit that was published before the change.
2. Check out that commit, or revert the change.
3. Run `npm exec riebeckite check` and `npm exec riebeckite build`.
4. Publish the generated `dist/`.

On Cloudflare Workers, you can also open the deployment history in the dashboard and redeploy an earlier version. If you changed `site.baseUrl` or other settings, restore those values as well.

`publish plan` shows the difference before publishing. See [Publication workflow](./publication-workflow.md).

## Summary

Deployment boils down to:

```text
Content
  ↓
riebeckite build
  ↓
dist/
  ↓
Cloudflare Workers
```

- Publish manually → [Cloudflare Workers](./cloudflare-workers.md)
- Publish automatically on push → [GitHub Actions](./github-actions.md)
- Separate the content repository → [Separate content repository](./separate-content-repository.md)
- Use another host → [Other hosts](./other-hosts.md)

## See also

- Cloudflare deployment template — the files this section documents
- [Build system](../../framework/build-system.md) — what `riebeckite build` writes
- [Analytics](../analytics.md) — the optional, separate page-view collector



