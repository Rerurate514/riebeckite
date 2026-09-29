# Separating Content and the Site (In Depth)

[Separating Content from the Site](./content-and-site-repos.md) explains separate-repository operation as a walkthrough. This page is its "in depth" companion: it explains **why the configuration works this way** and covers the cases you dig into later — copying assets, authenticating CI, and running submodules.

If you are new, read [separating content from the site](./content-and-site-repos.md) first, and use this page when you want to understand the mechanics or when operations go wrong.

## 1. Why "outside the site" works

The resolution rules for `content.directory` in `riebeckite.config.ts`:

| Name | Role | Default / resolution base |
| --- | --- | --- |
| `appRoot` | The HonoX/Vite application. Owns `app/`, `public/`, routes, generated styles, and build output | Vite's `root` |
| `configRoot` | The directory that contains `riebeckite.config.ts` | `appRoot` |
| `contentRoot` | The absolute filesystem root of the configured content directory or Obsidian vault | `path.resolve(appRoot, content.directory)` |

The key point: a relative `content.directory` is **always relative to `appRoot`**, and does not change when `configRoot` or the working directory changes. The integration resolves all three roots before running content or plugins, and the CLI uses the same result. So from a nested directory, a CI working directory, or an editor task, the same vault is always read.

```ts
// site/riebeckite.config.ts
export default defineConfig({
  content: {
    directory: "../vault", // relative to appRoot
  },
});
```

Do not assemble the value from `process.cwd()`, and do not point `appRoot` at the vault. The vault is source data; the Vite application root stays the site.

### 1-1. Reading content from the application side

When an application route or island creates its own `ContentManager`, use the same absolute path rather than the raw relative value.

```ts
// site/app/config.ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveConfigModule } from "@riebeckite/core";
import * as rawConfigModule from "../riebeckite.config";

const appRoot = fileURLToPath(new URL("../", import.meta.url));
const rawConfig = resolveConfigModule(rawConfigModule);

export const config = {
  ...rawConfig,
  content: {
    ...rawConfig.content,
    directory: path.resolve(appRoot, rawConfig.content.directory),
  },
};
```

Pass `config.content.directory` to the `ContentManager`. It is already absolute, so resolving it again against another base is a common source of errors.

## 2. The three patterns

| Pattern | Layout | Choose it when | Deployment consideration |
| --- | --- | --- | --- |
| A. One repository | Site and articles in one Git repository (use `content/`) | You want a single repository for a personal blog | No extra setup |
| B. Separate folders, one repository | `site/` and `vault/` side by side in one repository | You share history but want locations and visibility apart | Set `content.directory: "../vault"` on the site side |
| C. Separate repositories (recommended) | Articles private, site public | You want articles private or updates decoupled | CI needs setup to fetch the articles repository |

### 2-1. Pattern B layout

```text
notes-repo/
├─ site/                ← appRoot (contains riebeckite.config.ts)
│  └─ riebeckite.config.ts
└─ vault/               ← referenced by directory: "../vault"
```

## 3. Pattern C in detail

The basic flow is in [separating content from the site](./content-and-site-repos.md). This section adds the details that walkthrough omits.

### 3-1. Keep the vault in a private repository

- After `git init`, create the **private** GitHub repository before the first push.
- `.obsidian/` is generated when Obsidian opens the vault. Even if it is pushed, putting `.obsidian/**` in `content.exclude` keeps it out of the site build.
- The baseline for private notes is: no `publish: true`. Add a second layer by excluding a private folder (for example `private/**`) in `content.exclude` so those notes are not even loaded.

### 3-2. Two ways to fetch the articles repository in CI

The default deploy workflow (`templates/cloudflare/.github/workflows/deploy.yml`) checks out **only the site repository**.

**Option 1: an extra checkout in the workflow (recommended)**

```yaml
- name: Check out the site
  uses: actions/checkout@v4

- name: Check out the notes
  uses: actions/checkout@v4
  with:
    repository: <you>/notes
    path: notes
```

- The `repository` key targets the (possibly private) articles repository; CI on the same GitHub repository authenticates automatically.
- With `path: notes`, the checkout lands at `notes/` in the workflow working directory. If you use `../notes` locally, align `directory` in CI (for example `notes`, or a relative path based on the layout) so resolution matches. Keep the layout shape identical locally and in CI.
- Deploys update whenever articles are pushed — the simplest option when article updates dominate.

**Option 2: Git submodule**

```sh
cd my-site
git submodule add git@github.com:<you>/notes.git content
```

- `content` becomes a link to the articles repository; align `directory` in `riebeckite.config.ts` with `content`.
- Add `submodules: recursive` to `actions/checkout@v4` in the workflow so CI fetches the dependency.
- The referenced commit of a submodule is **recorded in the site repository**. Updating articles is a two-step operation: update the reference on the site side, commit, and push.

```sh
cd content && git pull
cd ..
git add content
git commit -m "update articles"
```

If article updates dominate, Option 1 is the easier fit; if you want the history pinned on the site side, use Option 2.

### 3-3. Authentication for private repositories in CI

- For a **private repository on the same GitHub account**, `actions/checkout` with `repository:` uses `github.token` automatically — no extra setup.
- When that does not apply (another organization, another host such as GitLab, etc.), register a PAT (personal access token) or deploy key as a secret and pass it with `token:`.
- Use a minimal-scope PAT that can read the private vault, under a dedicated secret name rather than the default token.

## 4. Publication rules and assets

Under the explicit strategy (the default `publishStrategy: "explicit"`), only notes with `publish: true` are published.

### 4-1. Attachments are not copied automatically

Files like `![[attachments/x.png]]` get URLs but are **not automatically copied**. Add a prebuild step on the site side that copies only the files you publish. Reference implementation: [`apps/web/scripts/build_images.ts`](../../apps/web/scripts/build_images.ts) (called from the `prebuild` script, `tsx scripts/build_images.ts`, copying into `public/assets/attachments/`).

The generated URL has this stable shape:

```text
/assets/attachments/<relative logical path from the vault>
```

- `attachment()` reads the embedded file's size from the resolved vault root and rejects paths outside the root.
- `media()` renders the matching audio/video for the same logical path.
- Do not take the shortcut of copying the entire vault. It risks leaking private notes, unreferenced attachments, and `.obsidian` metadata. Until a publish boundary check is introduced, the publish filter and asset-copy policy are the site application's responsibility.

## 5. Troubleshooting (in depth)

| Symptom | Fix |
| --- | --- |
| Articles do not appear | Check `publish: true`, `exclude` patterns, and `inspect content --list` |
| `doctor` reports a source problem | Check the resolved directory with `inspect config`; verify the relative `directory` against its base (appRoot) |
| CI build cannot find the vault | Confirm the workflow has the extra checkout or `submodules: recursive` |
| A private repository not resolvable via `github.token` (e.g., another host) | Confirm a dedicated secret (PAT, etc.) is passed with `token:` |
| Submodule articles do not update | On the site side: `cd content && git pull` → `git add content` → commit → push |
| Images 404 after deploy | Confirm the prebuild copy runs before the build and targets `public/assets/attachments/` |
| Works locally but the path differs in CI | Check the CI working directory and the relative base (appRoot). `../notes` vs `notes` is a common source of drift |

## Further reading

- [Separating Content from the Site](./content-and-site-repos.md) — a step-by-step introduction
- [Configuration](./configuration.md) — root resolution and external vaults in detail
- [Usage Guide](./guide.md) — external vault examples and assets
- [Cloudflare deploy template](../../templates/cloudflare/README_en.md) — deployment workflow details
- E2E fixture [`tests/external-site/fixture/site`](../../tests/external-site/fixture/site) — a working example of a vault outside the site