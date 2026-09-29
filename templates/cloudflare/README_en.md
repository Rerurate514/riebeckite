# Cloudflare deployment template

A standard [GitHub Actions](https://docs.github.com/actions) plus Cloudflare
Workers Static Assets setup for a Riebeckite site. Copy the files into a site
repository to build on every push and deploy the generated assets.

[日本語](./README_ja.md)

## What is included

| File | Role |
| --- | --- |
| `wrangler.jsonc` | Worker name, compatibility settings, and the static-assets directory (`./dist`) |
| `.github/workflows/deploy.yml` | Check, build, and deploy the site on push to `main` (or by manual dispatch) |

## Prerequisites

- A working Riebeckite site with a `build` script. The reference application and
  the [external-site fixture](../../tests/external-site/README.md) both use
  `riebeckite build`, which writes the Vite output to `dist/`.
- A committed `package-lock.json`, so CI can run `npm ci` reproducibly.
- A Cloudflare account with Workers enabled.

## Apply the template

1. Copy `wrangler.jsonc` to the site root and change `name` to a unique Worker
   name.
2. Copy `.github/workflows/deploy.yml` to the site repository at the same path
   (`.github/workflows/deploy.yml`).
3. Create a Cloudflare API token with the **Workers Scripts: Edit** permission,
   then add two repository secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
4. Push to `main`, or run the workflow manually from the Actions tab.

## Local verification

The build and the configuration can be exercised without deploying:

```sh
npm install
npm run build
npx wrangler deploy --dry-run
```

`wrangler deploy --dry-run` validates `wrangler.jsonc` and the asset directory
without contacting Cloudflare. `npx wrangler dev` serves the same output
locally.

## How the workflow works

1. Checks out the repository.
2. Installs dependencies with `npm ci`.
3. Runs `npm run check`, the read-only configuration and plugin validation.
4. Runs `npm run build` to generate `dist/`.
5. Deploys with `cloudflare/wrangler-action`, using the repository secrets.

## Notes

- **Static assets are enough.** Riebeckite pre-renders content routes and plugin
  endpoints during the build, so the generated `dist/` is deployed as static
  assets without a runtime `main` entry. The reference application uses the same
  shape in `apps/web/wrangler.jsonc`.
- **Build state stays at build time.** `.riebeckite/` and plugin caches are not
  part of `dist/` and never reach the Worker runtime.
- **Attachments are site-owned.** Copy only the files you intend to publish in a
  `prebuild` step before the build, as the reference application does.

## See also

- [Usage Guide — Preview and deploy](../../docs/en/guide.md#7-preview-and-deploy)
- [HonoX Integration](../../docs/en/honox-integration.md)
- [Build System](../../docs/en/build-system.md)
