# deploy-external-content

The smallest readable Riebeckite site: Obsidian Markdown, the minimal theme, and a single page you can read end to end.

## Commands

```sh
npm install
npm exec riebeckite check
npm exec riebeckite dev
npm exec riebeckite build
```

## First edits

- `octo-org/notes`: the content repository that holds the articles.
- `content/`: clone `https://github.com/octo-org/notes.git` here for local preview. This directory is ignored by Git.
- `riebeckite.config.ts`: set `site.title`, `site.baseUrl`, and `content.directory`.
- `public/favicon.ico`: replace the site icon when you are ready.

## Deployment configuration

The GitHub Actions deployment reads the content repository and deploys to Cloudflare. Add these secrets and variables before the first run:

- `RIEBECKITE_CONTENT_READ_TOKEN` (secret) — in **this site repository**. Required only when the content repository is private or internal. Use a fine-grained token scoped to the content repository with **Contents: read**.
- `RIEBECKITE_APP_ID` and `RIEBECKITE_APP_PRIVATE_KEY` (secrets) — in the **content repository**. A GitHub App mints short-lived tokens to dispatch updates to this site. Set the App's repository permission **Contents: read and write**.
- `SITE_DISPATCH_TOKEN` (secret, optional) — fallback when you do not use a GitHub App. Add it to the **content repository** as a fine-grained token scoped to this site repository with **Contents: read and write**.
- `CLOUDFLARE_API_TOKEN` (secret) — in **this site repository** for the Cloudflare deploy.
- `CLOUDFLARE_ACCOUNT_ID` (variable) — in **this site repository's** Actions variables. It is not a secret.

The workflows reference these names and never contain their values. Never commit the values. See the [separate content repository guide](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/guides/deployment/separate-content-repository.md) for the full setup.
