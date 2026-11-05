---
date: 2026-11-05
title: Separate Directories Setup
sidebar:
  label: Separate Directories Setup
  order: 23
---
# Separate Directories Setup

The separate-directories layout keeps an Obsidian vault and the site code in one repository, but in different folders. The vault stays a normal Markdown folder while `site/` contains the Riebeckite project.

Official sample: [Rerurate514/riebeckite-e2e-directories](https://github.com/Rerurate514/riebeckite-e2e-directories) — [directories.riebeckite.dev](https://directories.riebeckite.dev)

```text
my-project/
├── vault/
│   ├── index.md
│   ├── notes/
│   └── assets/
├── site/
│   ├── src/
│   ├── riebeckite.config.ts
│   ├── package.json
│   └── wrangler.jsonc
└── .github/workflows/publish.yml
```

## 1. Create the site

From the repository root:

```sh
npx create-riebeckite site --preset starter --github-actions
cd site
npm install
```

## 2. Move the content into the vault

Create `vault/` at the repository root and move the generated content there:

```sh
mkdir ../vault
mv content/* ../vault/
rmdir content
```

On Windows, move the files with Explorer or `Move-Item`.

## 3. Point the site at the vault

Edit `site/riebeckite.config.ts`:

```ts
export default defineConfig({
  content: { directory: "../vault" },
  // ...
});
```

The path is relative to the configuration file, not the terminal's current directory.

## 4. Name the Worker and set the domain

Edit `site/wrangler.jsonc`:

```jsonc
{
  "name": "my-project",
  "routes": [{ "pattern": "my-project.example.com", "custom_domain": true }]
}
```

Set `site.baseUrl` to `https://my-project.example.com` and adjust `site.title`.

## 5. Run locally

```sh
cd site
npm exec riebeckite check
npm exec riebeckite dev
```

## 6. Configure the workflow

The generated `site/.github/workflows/publish.yml` assumes the project root is the repository root. Move it to the repository root and add:

- `push.paths`: `site/**`, `vault/**`, and the workflow file.
- `defaults.run.working-directory: site` for every run step.
- `cache-dependency-path: site/package-lock.json` in `actions/setup-node`.
- `workingDirectory: site` on `cloudflare/wrangler-action`.
- Cache paths prefixed with `site/` where the workflow stores build state.

Keep `package-lock.json` in `site/`. See the sample workflow for the complete file:

<https://github.com/Rerurate514/riebeckite-e2e-directories/blob/main/.github/workflows/publish.yml>

## 7. Deploy

Add `CLOUDFLARE_API_TOKEN` as a repository secret and `CLOUDFLARE_ACCOUNT_ID` as a repository variable, then push `main`. The workflow builds from `site/` and deploys the Worker.

## Common mistakes

- Running `npm` commands from the repository root. Use `site/`.
- Using `vault` instead of `../vault`. The path starts at `site/`.
- Leaving the workflow inside `site/.github/`. GitHub only reads `.github/workflows/` at the repository root.
- Forgetting `vault/**` in `push.paths`, so content updates do not trigger a deploy.

## Next

- [Separate Repositories Setup](./separate-repositories-setup.md)
- [GitHub Actions](../guides/deployment/github-actions.md)
- [Publication Workflow](../guides/deployment/publication-workflow.md)
