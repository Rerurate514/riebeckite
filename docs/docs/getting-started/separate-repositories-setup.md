---
date: 2026-11-06
title: Separate Repositories Setup
sidebar.label: Separate Repositories Setup
sidebar.order: 24
---
# Separate Repositories Setup

Separate repositories keep your writing in a vault repository and the site implementation in a site repository. A push to the vault starts a deployment of the site.

This guide walks through the GitHub and Cloudflare screens, including where to click and what to enter. It takes about 20–30 minutes.

You need:

- A GitHub account
- Node.js `^20.19.0` or `>=22.12.0`
- A Cloudflare account
- A terminal

> GitHub sometimes moves or renames settings. This page matches the UI as of November 2026. If you cannot find an item, use the search box in Settings.

Do the GitHub setup in a browser. The GitHub mobile app does not include Developer settings.

Official sample: [site](https://github.com/Rerurate514/riebeckite-e2e-site) and [vault](https://github.com/Rerurate514/riebeckite-e2e-vault) — [repositories.riebeckite.dev](https://repositories.riebeckite.dev)

```text
my-vault/                 my-site/
├── index.md              ├── app/
├── notes/                ├── riebeckite.config.ts
└── assets/               ├── package.json
                          ├── wrangler.jsonc
                          └── .github/workflows/publish.yml
```

## 1. Create the site locally

In a terminal, go to the folder where the site should live and run:

```sh
npx create-riebeckite my-site \
  --preset starter \
  --github-actions \
  --content-repository OWNER/my-vault \
  --site-repository OWNER/my-site
cd my-site
npm install
```

Replace `OWNER` with your GitHub username or organization. The `my-vault` and `my-site` names must match the repositories you create in step 2.

To use the interactive prompts instead, run `npx create-riebeckite my-site` and answer:

| Prompt | Answer |
| --- | --- |
| Where will you write content? | `Separate GitHub repository` |
| Content repository | `OWNER/my-vault` |
| Site repository | `OWNER/my-site` |
| Install dependencies now? | `Yes` or `No` |

The CLI also asks about a template and optional feature packs. Keep the defaults unless you have a preference.

When content lives in a separate repository, the CLI does not ask `Set up deployment?`. It adds the GitHub Actions deployment setup automatically.

`github/notify-site.yml` does nothing yet. You will move it to the vault in step 6.

Once you know the public URL, set it in `site.baseUrl` in `riebeckite.config.ts`. If you use a custom domain, also set `routes` in `wrangler.jsonc`. Follow step 2 of [Integrated Setup](./integrated-setup.md). For a first publish on `workers.dev`, the generated settings work as they are.

## 2. Create two repositories on GitHub

Select `+` in the top right of GitHub → **New repository**, and create two repositories:

| Repository | Purpose | Visibility |
| --- | --- | --- |
| `my-site` | Site implementation | Private |
| `my-vault` | Content | Private or public |

Do not select a README, `.gitignore`, or license under **Initialize this repository with**. Leave both repositories empty so the first local push goes through.

> Do not push the site yet. Pushing before the Cloudflare secret is registered makes the first deployment fail. You will push the site in step 5.

Next, create the vault content. If you already have an Obsidian vault, use that folder as it is.

```text
my-vault/
├── index.md
├── notes/
└── assets/
```

A minimal `index.md` needs frontmatter:

```md
---
publish: true
title: Home
---

# Home
```

In the vault folder, run:

```sh
git init
git branch -M main
git add .
git commit -m "Add vault"
git remote add origin https://github.com/OWNER/my-vault.git
git push -u origin main
```

Empty folders are not tracked by Git, so `index.md` alone is fine at first. The vault can stay private. Step 3 sets up the token the site uses to read it.

## 3. Set up the GitHub App and secrets

To tell the site about a vault push, a workflow in the vault sends a notification to the site. This guide uses a GitHub App.

### 3-1. Create the GitHub App

1. Profile picture in the top right → **Settings**.
2. **Developer settings** at the bottom of the left sidebar.
3. **GitHub Apps** → **New GitHub App**.
4. Fill in the form as follows.

| Field | Value |
| --- | --- |
| GitHub App name | A unique name (for example, `riebeckite-notify-OWNER`) |
| Homepage URL | `https://github.com/OWNER/my-site` |
| Webhook → Active | Clear the checkbox |
| Repository permissions → Contents | **Read and write** |
| Where can this GitHub App be installed? | **Only on this account** |

5. Click **Create GitHub App**.

The **App ID** appears at the top of the app settings page. Note it for later. It is not the **Client ID**.

If the repositories belong to an organization, create the app under the organization's **Settings** → **Developer settings** → **GitHub Apps**.

### 3-2. Create a private key

1. In the app settings, open **Credentials** → **Key pairs** in the left sidebar.
2. Click **New key**. GitHub downloads a `.pem` private key. You can download it only once.
3. On the older UI, the labels are **Private keys** → **Generate a private key**.

### 3-3. Install the app on the site repository

1. In the app settings, click **Install App** in the left sidebar.
2. Click **Install** next to `OWNER`.
3. Select **Only select repositories** and choose only `my-site`.
4. Click **Install**.

Do not install the app on the vault repository.

### 3-4. Add the secrets to the vault

Open the vault repository, then go to **Settings** → **Secrets and variables** → **Actions** → **New repository secret** and add:

| Name | Secret |
| --- | --- |
| `RIEBECKITE_APP_ID` | The App ID from 3-1 |
| `RIEBECKITE_APP_PRIVATE_KEY` | The contents of the `.pem` file |

Paste the whole file, from `-----BEGIN ... PRIVATE KEY-----` to `-----END ... PRIVATE KEY-----`.

> The notification token goes in the **vault** repository. The token that reads the vault goes in the **site** repository. It is easy to mix them up.

### 3-5. Let the site read a private vault

If the vault is private or internal, the site repository needs one more secret. Skip this section for a public vault.

1. Profile picture → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. Set **Token name** to something like `riebeckite-content-read`.
3. Choose an **Expiration**.
4. Choose the vault owner under **Resource owner**.
5. **Repository access** → **Only select repositories** → `my-vault`.
6. **Permissions** → **Repository permissions** → **Contents** → **Read-only**.
7. Click **Generate token** and copy the token.
8. In the **site** repository, go to **Settings** → **Secrets and variables** → **Actions** → **New repository secret** and add `RIEBECKITE_CONTENT_READ_TOKEN`.

### 3-6. Use a personal access token instead

To notify the site without a GitHub App, add `SITE_DISPATCH_TOKEN` to the vault repository. Limit the token to the site repository and give it **Contents: Read and write**. Follow the steps in 3-5, but choose `my-site` and **Read and write**.

## 4. Configure Cloudflare

### 4-1. Copy the account ID

1. Sign in to the Cloudflare dashboard.
2. Open **Workers & Pages**.
3. **Account Details** on the right shows the **Account ID**. Copy it.

You can also use **Copy account ID** in the profile menu.

### 4-2. Create an API token

1. Profile picture → **My Profile**.
2. **API Tokens** → **Create Token**.
3. Choose **Create Custom Token**.
4. Add these three permissions.

| Scope | Permission | Level |
| --- | --- | --- |
| Account | Workers Scripts | Edit |
| Zone | Workers Routes | Edit |
| Zone | Zone | Read |

5. Under **Zone Resources**, choose the zone for your custom domain. If you have not decided yet, **All zones** is fine.
6. **Continue to summary** → **Create Token**.
7. Copy the token. You cannot see it again after closing the page.

### 4-3. Add them to the site repository

In the site repository, go to **Settings** → **Secrets and variables** → **Actions**:

- **Secrets** tab → **New repository secret**: `CLOUDFLARE_API_TOKEN` with the token from 4-2.
- **Variables** tab → **New repository variable**: `CLOUDFLARE_ACCOUNT_ID` with the account ID from 4-1.

### 4-4. Set the public URL

For a `workers.dev` URL, you can leave the settings as they are. For a custom domain, follow step 2 of [Integrated Setup](./integrated-setup.md) to set `routes` in `wrangler.jsonc` and `site.baseUrl` in `riebeckite.config.ts`.

## 5. Push the site

Clone the content repository into `content/` for the local check (or generate with `--clone-content`). Until `content/` exists, `check` and `build` fail with "Could not find the content directory":

```sh
cd my-site
git clone https://github.com/OWNER/my-vault.git content
npm exec riebeckite check
npm exec riebeckite build
```

A `dist/` folder means the build succeeded. Do not commit `dist/`, `node_modules/`, or `content/`.

Push the site repository:

```sh
git init
git branch -M main
git add .
git commit -m "Add site"
git remote add origin https://github.com/OWNER/my-site.git
git push -u origin main
```

Open the **Actions** tab in the site repository and confirm that **Deploy to Cloudflare Workers** succeeds. The first run takes a few minutes.

> After the first deployment, the workflow creates a `publication-state` branch to store publication state. Do not delete it.

## 6. Add the notification workflow and test

In the vault repository:

1. **Add file** → **Create new file**.
2. Enter `.github/workflows/notify-site.yml` as the file name. Typing `/` creates folders.
3. Paste the contents of `my-site/github/notify-site.yml` from your local copy.
4. **Commit changes...** → **Commit changes**.

This commit is a push to `main`, so the notification workflow runs for the first time. In the vault repository's **Actions** tab, confirm that **Notify Riebeckite site** succeeds.

Then open the site repository's **Actions** tab and confirm that **Deploy to Cloudflare Workers** starts with `content-updated` and succeeds. Open the public URL. If the content of the vault's `index.md` appears, the setup is complete.

From then on, every Markdown push to the vault runs the same flow.

### If something fails

| Symptom | What to check |
| --- | --- |
| **Notify Riebeckite site** does not appear in the vault's Actions | The file is at `.github/workflows/notify-site.yml`. The vault's default branch is `main`. |
| **Notify Riebeckite site** fails | `RIEBECKITE_APP_ID` and `RIEBECKITE_APP_PRIVATE_KEY` exist in the vault. The App ID is not the Client ID. The private key includes the BEGIN and END lines. |
| The site's Actions do not start | The app is installed on `my-site`. Its Contents permission is **Read and write**. With a PAT, `SITE_DISPATCH_TOKEN` exists in the vault. |
| The site's checkout fails | For a private vault, `RIEBECKITE_CONTENT_READ_TOKEN` exists in the site. Its Contents permission is **Read-only**. |
| The Cloudflare deployment fails | Check the permissions of `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. |
| The page does not change | The site's Actions succeeded. Wait a few minutes for Cloudflare to update. |

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
