---
title: Deployment
sidebar:
  label: Deployment
  order: 50
---
# Deployment

Riebeckite builds a static site: `npm exec riebeckite build` writes the publishable files to `dist/`. Deployment means hosting that folder. The reference target is [Cloudflare Workers](https://workers.cloudflare.com/) with static assets.

There are three deployment methods, and they are options you add over time rather than mutually exclusive choices:

| Method | Choose it when |
| --- | --- |
| Local-first (publish from your machine) | You want the fastest first publish |
| GitHub Actions | You want to deploy on every push |
| Content Repository split | You want the vault and site in separate repositories |

Local-first does not replace GitHub Actions. Add GitHub Actions when you want automation.

```text
Local-first
  → publish to Cloudflare Workers from your machine

GitHub Actions
  → publish automatically on push

Content Repository split
  → keep site and content repositories separate
```

This beginner page covers Local-first, GitHub Actions, and adding a Custom Domain. If you want the split, see [Content Repositories](../guides/content-repositories.en.md) and [Separate Content Repository](../guides/deployment/separate-content-repository.en.md).

## 1. First deploy from your machine (Local-first)

This is the fastest path to a public site.

1. Create a [Cloudflare account](https://www.cloudflare.com/).

2. Scaffold a site with `Cloudflare Workers` as the deployment choice:

   ```sh
   npx create-riebeckite my-site
   ```

   Choosing `Cloudflare Workers` includes the Wrangler dependency and `wrangler.jsonc` in the generated site, then asks `Deploy now?` after installing dependencies. `Yes` builds and deploys right away; `Later` finishes the scaffold and you run these commands afterwards:

   ```sh
   npm run build
   npm exec riebeckite deploy
   ```

3. `riebeckite deploy` publishes `dist/` to Cloudflare Workers and opens the Wrangler login in a browser on the first run. It does not build, so create `dist/` with `riebeckite build` first. Change the Worker name by editing `name` in the generated `wrangler.jsonc`. For a site generated with `Not now`, install Wrangler first with `npm install -D wrangler`.

4. Open the URL printed by Wrangler, such as `https://<name>.<account>.workers.dev`. If your Riebeckite site loads, the first deploy succeeded.

After the public URL is known, set `site.baseUrl` in `riebeckite.config.ts` to that URL, then build and deploy once more so generated URLs such as sitemap entries use the final address.

```sh
npm exec riebeckite build
npm exec riebeckite deploy
```

### Add a Custom Domain

After the first Worker deployment, run this from the site repository:

```sh
npm exec riebeckite deploy domain
```

Enter the apex domain such as `example.com`, or a subdomain such as `docs.example.com`. The command accepts a hostname only, shows the planned change, and asks for confirmation before updating `wrangler.jsonc` or `wrangler.json`. It adds this declarative Wrangler configuration:

```jsonc
{
  "routes": [
    { "pattern": "docs.example.com", "custom_domain": true }
  ]
}
```

Choose **Deploy now** to use the normal `riebeckite deploy` flow. Otherwise, deploy later with `npm exec riebeckite deploy`. Cloudflare Workers creates the DNS record and TLS certificate for a Custom Domain in a zone active in your Cloudflare account. This is different from a Worker Route: use a Custom Domain when the Worker is the origin for the site.

The command leaves `wrangler.toml` unchanged. Add the equivalent configuration manually when you use TOML:

```toml
[[routes]]
pattern = "docs.example.com"
custom_domain = true
```

Before deploying, ensure the domain is in an active Cloudflare zone in the same account. A hostname with an existing CNAME record, a zone outside the account, or a non-Custom-Domain Worker Route for the hostname must be resolved first. Wildcard domains and URL paths are not Custom Domains. You can keep the `workers.dev` URL available by explicitly setting `workers_dev = true` (TOML) or `"workers_dev": true` (JSON) when your configuration needs it.

After Cloudflare has activated the hostname, change `site.baseUrl` to `https://docs.example.com` (or your apex domain), build, and deploy again. The domain configuration stays in version control, so GitHub Actions deploys the same Worker configuration on every push.

## 2. Automatic deploy with GitHub Actions

If you want deploys to run on every push, choose `GitHub Actions` when the CLI asks for the deployment. From the command line, the same choice is:

```sh
npx create-riebeckite my-site --github-actions
```

This adds:

- `wrangler.jsonc`
- `.github/workflows/deploy.yml`

The generated workflow installs dependencies with `npm ci`, runs `npm exec riebeckite check`, builds with `npm exec riebeckite build`, and deploys with `cloudflare/wrangler-action@v3`.

Add these repository secrets in GitHub (Settings → Secrets and variables → Actions):

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Commit the `package-lock.json` created by `npm install`, then push to `main` or run the workflow manually from the Actions tab.

### Add it later to a Local-first site

If you already published from your machine, you do not need to recreate the site. Run this in the project:

```sh
npm exec riebeckite deploy setup
```

The command finds the Git repository and GitHub remote, checks the GitHub CLI and Wrangler logins, creates `.github/workflows/deploy.yml` from the same template, and registers `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` as repository secrets. It stops before pushing, so run `git push` when you are ready. Running it again is safe: an existing workflow and secrets are detected and left unchanged.

## 3. Advanced: separate content repository

Some teams keep the site implementation and Markdown content in separate repositories. That setup is useful for an existing Obsidian vault, separate editor/developer workflows, or different lifecycles for content and site code.

You do not need this for your first site. When you do, start with [Content Repositories](../guides/content-repositories.en.md). The GitHub Actions automation details live in [Separate Content Repository](../guides/deployment/separate-content-repository.en.md).

## Next

- [Guides →](../guides/README.en.md) — writing content, Obsidian, localization, and deployment in depth
- [Plugins →](../plugins/README.en.md) — add features by goal
- [Themes →](../themes/README.en.md) — change the site's look
