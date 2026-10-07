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

- `content/index.md`: the first published page.
- `riebeckite.config.ts`: set `site.title`, `site.baseUrl`, and `content.directory`.
- `public/favicon.ico`: replace the site icon when you are ready.

## Deployment secrets

The GitHub Actions deployment reads the content repository and deploys to Cloudflare. Add these repository secrets before the first run:

- `RIEBECKITE_CONTENT_READ_TOKEN` — in **this site repository**. Required only when the content repository is private or internal. Use a fine-grained token scoped to the content repository with **Contents: read**.
- `SITE_DISPATCH_TOKEN` — in the **content repository**. Lets its `notify-site.yml` dispatch updates to this site. Use a fine-grained token scoped to this site repository with **Contents: read and write**.
- `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` — in **this site repository** for the Cloudflare deploy.

The workflows reference these secret names and never contain their values. Never commit the values. See the [separate content repository guide](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/guides/deployment/separate-content-repository.en.md) for the full setup.
