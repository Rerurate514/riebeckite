# Deployment

Riebeckite builds a static site: `npm exec riebeckite build` writes the publishable files to `dist/`. Deployment means hosting that folder. The reference target is [Cloudflare Workers](https://workers.cloudflare.com/) with static assets.

Think about deployment in three stages:

```text
1. First deploy
   ↓
   Deploy manually to Cloudflare Workers

2. Automatic deploy
   ↓
   Deploy with GitHub Actions

3. Advanced setup
   ↓
   Split site and content repositories
```

This beginner page covers stages 1 and 2. If you want the advanced split, see [Content Repositories](../guides/content-repositories.md) and [Separate Content Repository](../guides/deployment/separate-content-repository.md).

## 1. First deploy from your machine

1. Create a [Cloudflare account](https://www.cloudflare.com/).

2. In the site folder, install Wrangler:

   ```sh
   npm install -D wrangler
   ```

3. Create `wrangler.jsonc` in the site root:

   ```jsonc
   {
     "name": "my-site",
     "compatibility_date": "2026-03-10",
     "compatibility_flags": ["nodejs_compat"],
     "assets": { "directory": "./dist" }
   }
   ```

   Change `name` to a Worker name unique to you. Keep `assets.directory` as `./dist`.

4. Build, log in, and deploy:

   ```sh
   npm exec riebeckite build
   npx wrangler login
   npx wrangler deploy
   ```

5. Open the URL printed by Wrangler, such as `https://<name>.<account>.workers.dev`. If your Riebeckite site loads, the first deploy succeeded.

After the public URL is known, set `site.baseUrl` in `riebeckite.config.ts` to that URL, then build and deploy once more so generated URLs such as sitemap entries use the final address.

## 2. Automatic deploy with GitHub Actions

If you want deploys to run on every push, generate the site with the GitHub Actions option:

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

## 3. Advanced: separate content repository

Some teams keep the site implementation and Markdown content in separate repositories. That setup is useful for an existing Obsidian vault, separate editor/developer workflows, or different lifecycles for content and site code.

You do not need this for your first site. When you do, start with [Content Repositories](../guides/content-repositories.md). The GitHub Actions automation details live in [Separate Content Repository](../guides/deployment/separate-content-repository.md).

## Next

- [Guides →](../guides/README.md) — writing content, Obsidian, localization, and deployment in depth
- [Plugins →](../plugins/README.md) — add features by goal
- [Themes →](../themes/README.md) — change the site's look
