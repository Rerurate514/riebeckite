# deploy-github-actions-pnpm

The smallest readable Riebeckite site: Obsidian Markdown, the minimal theme, and a single page you can read end to end.

## Commands

```sh
pnpm install
pnpm exec riebeckite check
pnpm exec riebeckite dev
pnpm exec riebeckite build
```

This site uses pnpm 11 or newer. Commit `pnpm-lock.yaml`; the GitHub Actions workflow installs it with `pnpm install --frozen-lockfile`.

## First edits

- `content/index.md`: the first published page.
- `riebeckite.config.ts`: set `site.title`, `site.baseUrl`, and `content.directory`.
- `public/favicon.ico`: replace the site icon when you are ready.
