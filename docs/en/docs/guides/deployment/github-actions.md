# GitHub Actions

The deployment workflow checks, builds, and deploys a Riebeckite site on every push. You can let `create-riebeckite` generate it, or copy the [Cloudflare template](../../../../../templates/cloudflare/README_en.md).

## Generate the workflow

```sh
npx create-riebeckite my-site --preset starter --github-actions
```

With `--github-actions`, the generator adds two things to the site:

| File | Role |
| --- | --- |
| `wrangler.jsonc` | Worker name, compatibility settings, and the static-assets directory (`./dist`) |
| `.github/workflows/deploy.yml` | Check, build, and deploy on push to `main`, manual dispatch, or a `content-updated` repository dispatch |

Without `--github-actions`, these files are not generated. See [Cloudflare Workers](./cloudflare-workers.md) for the manual path.

## Prerequisites

- A site whose `build` script runs `riebeckite build` and writes `dist/`.
- A **committed `package-lock.json`**, so CI can run `npm ci` reproducibly. Run `npm install` once locally and commit the lockfile.
- A Cloudflare account with Workers enabled.

## Add the secrets

In the **site repository**, under Settings → Secrets and variables → Actions, add:

- `CLOUDFLARE_API_TOKEN` — create it in Cloudflare with the **Workers Scripts: Edit** permission
- `CLOUDFLARE_ACCOUNT_ID`

Then push to `main`, or run the workflow manually from the Actions tab.

## How the workflow works

1. Checks out the site repository.
2. (Only for a separate content repository) checks out the content repository into `content/`.
3. Sets up Node.js and installs dependencies with `npm ci`.
4. Runs `npm exec riebeckite check` — the read-only configuration and plugin validation.
5. Runs `npm exec riebeckite build` to generate `dist/`.
6. Deploys with [`cloudflare/wrangler-action`](https://github.com/cloudflare/wrangler-action) using the repository secrets.

## Triggers

The generated workflow starts on:

- `push` to `main`
- `workflow_dispatch` (the "Run workflow" button in the Actions tab)
- `repository_dispatch` with the type `content-updated`

The last one is the hook used by a separate content repository. A push to that repository does **not** start this workflow by itself — the content repository must send the dispatch. That setup is documented in [Separate content repository](./separate-content-repository.md).

## Local verification

Exercise the build and the configuration without deploying:

```sh
npm install
npm exec riebeckite build
npx wrangler deploy --dry-run
```

`wrangler deploy --dry-run` validates `wrangler.jsonc` and the asset directory without contacting Cloudflare. `npx wrangler dev` serves the same output locally.

## Notes

- **Static assets are enough.** Riebeckite pre-renders content routes and plugin endpoints, so `dist/` is served as static assets with no runtime `main` entry.
- **Build state stays at build time.** `.riebeckite/` and plugin caches are not part of `dist/` and never reach the Worker runtime.
- **Attachments are site-owned.** Copy only the files you intend to publish in a `prebuild` step before the build.

## See also

- [Cloudflare Workers](./cloudflare-workers.md) — the manual deployment path
- [Separate content repository](./separate-content-repository.md) — CI reading articles from another repository
- [Cloudflare deployment template](../../../../../templates/cloudflare/README_en.md) — the source files
- [Build system](../../framework/build-system.md) — what the build writes


