---
date: 2026-11-05
title: Separate Repositories Setup
sidebar:
  label: Separate Repositories Setup
  order: 24
---
# Separate Repositories Setup

Separate repositories keep the content and the site implementation independent. A push to the vault repository can start a deployment in the site repository.

Official sample: [site](https://github.com/Rerurate514/riebeckite-e2e-site) and [vault](https://github.com/Rerurate514/riebeckite-e2e-vault) — [repositories.riebeckite.dev](https://repositories.riebeckite.dev)

```text
my-vault/                 my-site/
├── index.md              ├── src/
├── notes/                ├── riebeckite.config.ts
└── assets/               ├── package.json
                          ├── wrangler.jsonc
                          └── .github/workflows/publish.yml
```

## 1. Create the site

```sh
npx create-riebeckite my-site \
  --preset starter \
  --github-actions \
  --content-repository OWNER/my-vault \
  --site-repository OWNER/my-site
cd my-site
npm install
```

This generates a workflow that checks the vault out into `content/` before building. The scaffold also writes `github/notify-site.yml`; it is a template, not an active workflow.

## 2. Add the vault

Create the vault repository with `index.md`, `notes/`, and `assets/`. A minimal `index.md` needs frontmatter:

```md
---
publish: true
title: Home
---

# Home
```

## 3. Copy the notification workflow

Copy `github/notify-site.yml` to the vault repository as `.github/workflows/notify-site.yml`. It sends a `content-updated` dispatch to the site repository on every push to `main`.

## 4. Configure authentication

Use a GitHub App so each run gets a short-lived token.

1. Create a GitHub App owned by your account. Disable the webhook.
2. Repository permissions: **Contents: read and write** and **Metadata: read-only**.
3. Install the App only on the site repository.
4. In the **vault** repository, add secrets `RIEBECKITE_APP_ID` and `RIEBECKITE_APP_PRIVATE_KEY`. Paste the App's private key in PEM format.

The workflow mints a token with `actions/create-github-app-token` and calls `createDispatchEvent`. No long-lived token is stored.

If you cannot create a GitHub App, set `SITE_DISPATCH_TOKEN` in the vault repository instead. Use a fine-grained token limited to the site repository with **Contents: read and write**.

The site repository never needs the dispatch token. For a public vault, the content checkout uses the site workflow's `GITHUB_TOKEN`. For a private or internal vault, add `RIEBECKITE_CONTENT_READ_TOKEN` to the **site** repository with **Contents: read**.

## 5. Configure Cloudflare

In the **site** repository:

- Secret `CLOUDFLARE_API_TOKEN` with Account **Workers Scripts:Edit**, Zone **Workers Routes:Edit**, and Zone **Zone:Read**.
- Variable `CLOUDFLARE_ACCOUNT_ID` with the account ID.

Set `site.baseUrl` and the `routes` entry in `wrangler.jsonc`.

## 6. Test the flow

```sh
cd my-site
npm exec riebeckite check
npm exec riebeckite build
```

Push the site repository, then push a Markdown change to the vault. Confirm that:

1. `notify-site.yml` succeeds in the vault repository.
2. A `repository_dispatch` run starts in the site repository.
3. The page changes on the public site.

A failed dispatch usually means the App is not installed on the site repository, the App ID or private key is wrong, or the workflow lacks permission to create the dispatch.

## Which notification method?

| Method | Setup | Lifetime | Best for |
| --- | --- | --- | --- |
| GitHub App | Create an App and install it | Minutes per run | Recommended default |
| Fine-grained PAT | Create one token | Long-lived | A quick trial |
| Schedule polling | Add a cron trigger | None | A vault that changes infrequently |

Riebeckite's generated workflow supports the GitHub App and PAT fallback. Schedule polling is not generated because it delays publication and consumes runs.

## Next

- [Publication Workflow](../guides/deployment/publication-workflow.md)
- [GitHub Actions](../guides/deployment/github-actions.md)
- [Content Repositories](../guides/content-repositories.md)
