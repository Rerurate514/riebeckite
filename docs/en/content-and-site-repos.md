# Separating content from the site

For **keeping articles (Markdown / an Obsidian vault) separate from the site (code, configuration, themes)**, this guide walks through the setup and how to run it day to day.

## The idea: articles can live outside the site

`content.directory` in `riebeckite.config.ts` is a **relative path from the site (appRoot)** and can point at a folder outside it. Articles do not have to live inside the site.

```ts
// site/riebeckite.config.ts
export default defineConfig({
  content: {
    directory: "../vault", // the vault folder one level above the site
  },
  // ...
});
```

Because relative paths are always resolved from the site's root, the same vault is read no matter where you run the CLI. Resolution details are in [Configuration](./configuration.md), "Filesystem root and an external vault".

## Choose a pattern

| Pattern | Layout | Choose it when |
| --- | --- | --- |
| A. One repository | Site and articles in one Git repository (use `content/`) | You want a single repository for a personal blog |
| B. Separate folders, one repository | `site/` and `vault/` side by side in one repository | You share history but want locations and visibility apart |
| C. Separate repositories (recommended) | Articles private, site public | You want articles private or updates decoupled |

Choose C if you do not want articles public. The steps below are for C. For A and B the configuration is the same; only step 5 (handling the second repository) is unnecessary.

## Steps: separate repositories (pattern C)

### 1. Create the articles repository (the vault)

Create a folder anywhere and initialize it as a Git repository. If you use Obsidian, open this folder as a vault.

```sh
mkdir notes
cd notes
git init
```

Add a first note. `publish: true` marks a note as published, so leave it off notes you want to keep private.

```md
---
title: Hello
publish: true
---

My first note.
```

Push to a **private** GitHub repository and the articles stay unpublished.

```sh
git add .
git commit -m "first note"
# After creating a private repository on GitHub:
git remote add origin git@github.com:<you>/notes.git
git push -u origin main
```

### 2. Generate the site

Generate the site **next to** the articles repository.

```sh
npx create-riebeckite my-site
cd my-site
npm install
```

```text
workspace/
├─ notes/     ← the articles from step 1 (the vault)
└─ my-site/   ← the site from step 2
```

### 3. Point content.directory at the vault

In `my-site/riebeckite.config.ts`:

```ts
// my-site/riebeckite.config.ts
export default defineConfig({
  // ...
  content: {
    directory: "../notes",
    exclude: [".obsidian/**", "Templates/**", "private/**"],
  },
  // ...
});
```

- `directory: "../notes"` references the vault outside the site.
- `exclude` holds things you never publish: Obsidian settings (`.obsidian/**`), templates (`Templates/**`), and a private-notes folder (`private/**`).

### 4. Verify loading

```sh
npm exec riebeckite check
npm exec riebeckite doctor
npm exec riebeckite inspect config
npm exec riebeckite inspect content --list
```

- A wrong path is usually the relative `directory`. Check the resolved directory with `inspect config`.
- If articles do not appear, check for `publish: true` (the explicit strategy).

### 5. Use both repositories in deployment

The default deploy workflow checks out **only the site repository**. With articles in a second repository, CI builds cannot find the vault. Pick one of:

**Option 1: an additional checkout in the workflow (recommended)**

```yaml
- name: Check out the site
  uses: actions/checkout@v4

- name: Check out the notes
  uses: actions/checkout@v4
  with:
    repository: <you>/notes
    path: notes
```

Deploys update as soon as articles are pushed, so this is the simplest when articles change often. Align the layout with local builds — set `directory` to `notes` in both places.

**Option 2: Git submodule**

```sh
git submodule add git@github.com:<you>/notes.git content
```

Add `submodules: recursive` to `actions/checkout@v4` in the workflow. After updating articles, you must update the submodule reference on the site side and push.

## Publication rules

- **Never put `publish: true` on private notes**, and exclude whole private folders with `content.exclude`.
- **Attachments are not published automatically.** Files like `![[attachments/x.png]]` get URLs but are not copied. Add a prebuild step on the site side that copies only the files you publish (reference: call [`apps/web/scripts/build_images.ts`](../../apps/web/scripts/build_images.ts) from `prebuild`).

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Articles do not appear | Check `publish: true`, `exclude` patterns, and `inspect content --list` |
| CI build cannot find the vault | Add the extra checkout or submodule support |
| Images 404 after deploy | Confirm the prebuild copy runs before the build and targets `public/assets/attachments/` |

## Further reading

- [Separating content and the site (in depth)](./content-and-site-repos-in-depth.md) — the in-depth companion (root resolution, CI auth, assets, troubleshooting)
- [Configuration](./configuration.md) — root resolution details
- [Usage Guide](./guide.md) — external vault examples and assets
- [Cloudflare deploy template](../../templates/cloudflare/README_en.md) — deployment workflow details