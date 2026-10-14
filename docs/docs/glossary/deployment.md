---
title: Deployment
sidebar:
  hidden: true
---

# Deployment

The step that places the built site on a hosting target. The build produces the manifest and generated outputs, and the integration connects them to a platform such as Cloudflare Workers.

## What the build hands over

- The [manifest](./manifest.md).
- The [generated outputs](./generated-output.md).
- The build state used for the next [incremental build](./incremental-build.md).

## Targets

The [integration](./integration.md) connects the output to a platform. Static hosting serves the files directly; a worker or edge target serves them through a runtime.

## Deployment commands
The CLI provides several deployment methods:

| Method | Description |
| --- | --- |
| `riebeckite build` | Builds the site, writing output to `dist/` |
| `riebeckite deploy` | Deploys `dist/` to a Cloudflare Worker. Requires `wrangler` and a generated `wrangler.jsonc`. Can include a custom domain. |
| `riebeckite deploy setup` | Sets up GitHub Actions workflow for automatic deploys on push. Registers Cloudflare API secrets. |
| `riebeckite deploy domain` | Configures a custom domain for the deployed Worker. Updates `wrangler.jsonc` or `wrangler.toml`. |

On first deploy, run `npm exec riebeckite build` to generate `dist/`, then `npm exec riebeckite deploy` to publish. After setting a custom domain, update `site.baseUrl` in `riebeckite.config.ts` so that generated URLs (sitemap, feed, hreflang) use the final address.

## Related terms
