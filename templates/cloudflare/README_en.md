# Cloudflare deployment template

A standard [GitHub Actions](https://docs.github.com/actions) plus Cloudflare
Workers Static Assets setup for a Riebeckite site. Copy the files into a site
repository to build on every push and deploy the generated assets.

[日本語](./README_ja.md)

## What is included

| File | Role |
| --- | --- |
| `wrangler.jsonc` | Worker name, compatibility settings, and the static-assets directory (`./dist`) |
| `.github/workflows/deploy.yml` | Check, build, and deploy the site on push to `main`, manual dispatch, or `content-updated` repository dispatch |
| `notify-site.yml` | Copy to a separate content repository as `.github/workflows/notify-site.yml` to notify the site after an article push |

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

## Separate content repository

Checking out an external content repository and triggering a deployment are
separate concerns. An additional `actions/checkout` step lets the site workflow
**read** articles; it does not make a push to that repository start the site
workflow. To deploy on every article push, use both workflows below. This works
with every `create-riebeckite` preset; presets only change the generated site.

When scaffolding a site, use `--github-actions --content-repository OWNER/notes
--site-repository OWNER/my-site`. `create-riebeckite` then generates the
external checkout, repository-dispatch receiver, and `github/notify-site.yml`
together. The steps below are for applying this template manually.

1. In the site workflow, retain `repository_dispatch: types: [content-updated]`
   and add the content checkout before installing dependencies:

   ```yaml
   - name: Check out the external content repository
     uses: actions/checkout@v4
     with:
       repository: OWNER/NOTES
       token: ${{ secrets.RIEBECKITE_CONTENT_READ_TOKEN || github.token }}
       path: content
   ```

   Set `content.directory` to `"content"`. The checkout has no `ref`, so every
   `content-updated` run reads the current default-branch tip rather than an old
   site commit.
2. Copy `notify-site.yml` into the content repository as
   `.github/workflows/notify-site.yml`, replace `OWNER` and `SITE_REPOSITORY`,
   and add `SITE_DISPATCH_TOKEN` to **the content repository's** secrets.
3. For the preferred fine-grained PAT, limit repository access to the **site
   repository** and grant **Contents: read and write**. GitHub's repository
   dispatch endpoint requires `Contents: write`; `read` is also required by the
   repository-selection UI. A classic PAT needs the `repo` scope. A GitHub App
   installation token with **Contents: write** also works. Do not use the
   content repository's `GITHUB_TOKEN`: it cannot dispatch to another repository.
4. For a public content repository, no content-read secret is needed. For a
   private or internal content repository, add `RIEBECKITE_CONTENT_READ_TOKEN`
   to **the site repository's** secrets. Use a fine-grained PAT restricted to
   the content repository with **Contents: read**, or an equivalent read-only
   GitHub App installation token.

The notify workflow checks for a missing dispatch token without printing it.
GitHub reports an invalid target repository or insufficient dispatch permission
from `actions/github-script`; checkout reports a missing/private content
repository separately before Riebeckite's check/build and Cloudflare deploy.

| Method | Deploy on article push | Notes |
| --- | ---: | --- |
| Same repository | Yes | `push` is sufficient. |
| Separate repository + repository dispatch | Yes | Latest content is checked out for each run. |
| Separate repository + schedule | Delayed | Add a schedule trigger; no dispatch token. |
| Manual dispatch | No | Start from the Actions tab. |
| Git submodule | No | Update and push the site-side submodule reference. |

## Local verification

The build and the configuration can be exercised without deploying:

```sh
npm install
npm exec riebeckite build
npx wrangler deploy --dry-run
```

`wrangler deploy --dry-run` validates `wrangler.jsonc` and the asset directory
without contacting Cloudflare. `npx wrangler dev` serves the same output
locally.

## How the workflow works

1. Checks out the repository.
2. Installs dependencies with `npm ci`.
3. Runs `npm exec riebeckite check`, the read-only configuration and plugin validation.
4. Runs `npm exec riebeckite build` to generate `dist/`.
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
