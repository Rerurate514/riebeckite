---
date: 2026-10-06
title: Publishing
sidebar:
  label: Publishing
  order: 40
---
# Publishing

## `publish`

`publish` adds planning, scheduled publication, approval, artifact validation, and deploy diagnostics without changing `build` or `deploy`.

```sh
npm exec -- riebeckite publish plan --json
npm exec -- riebeckite publish status
npm exec -- riebeckite publish validate
npm exec -- riebeckite publish run --execute --provider cloudflare-workers
npm exec -- riebeckite publish approve <slug> --all
```

`plan` and `status` are read-only. `validate` exits non-zero when the plan has an error, approval is pending, or the build artifact does not match the plan. `run` does not build or deploy unless `--execute` is present. When `--execute` is used, Cloudflare Workers and other hosting adapters are deployed via the CLI. GitHub Pages must be deployed by its own workflow (`deploy({ provider: "github-pages" })`); it cannot be deployed via `publish run`. `record` records an external CI deployment without deploying again. `gate` is the single pre-deploy check; it always verifies the plan and artifact, and adds the approval check when `publication.requireApproval` is enabled. Approval is opt-in with `--require-approval` or the configuration; records live in `publication/approvals.json` and only a committed file on the deployed branch is trusted. Approval storage is configurable via `publication.approvalFile`; `publication/approvals.json` is only the default. `--state-file <path>` (or `RIEBECKITE_PUBLICATION_STATE`) moves the durable state file outside the project, as CI does; a malformed explicit file fails instead of silently starting from scratch. See [Publication workflow](../../guides/deployment/publication-workflow.md) for scheduling, hosting adapters, history, and CI.

## `deploy setup`, `deploy workflow`, and `deploy domain`

`deploy setup` and `deploy workflow` prepare configuration; `deploy domain` adds a Custom Domain and can run `wrangler deploy` after confirmation. `deploy` does not record publication state or history. Use `riebeckite publish run --execute` for the normal publication flow.

### `deploy setup`

`deploy setup` prepares continuous deployment to GitHub Actions for a project that is already a Git repository and published with Local-first.

```sh
npm exec riebeckite deploy setup
```

It detects the Git repository and the GitHub remote, checks the GitHub CLI (`gh`) and Wrangler logins, creates `.github/workflows/publish.yml` from the same template used by `create-riebeckite`, reads the Cloudflare account from your Wrangler login (asking you to choose when there is more than one), registers `CLOUDFLARE_API_TOKEN` as a repository secret, and stores `CLOUDFLARE_ACCOUNT_ID` as a repository variable (falling back to a secret when the installed `gh` cannot manage variables). The token is read from a hidden prompt or from `CLOUDFLARE_API_TOKEN` in the environment and is sent to `gh secret set` through standard input; it is never passed as a command argument or written to disk. The command does not create a GitHub repository and does not push. An existing non-Riebeckite workflow is reported and left unchanged, and the command stops before registering any secrets. Wrangler must be installed in the site (Local-first sites already have it). Run it again any time: a matching workflow and existing secrets are detected and skipped, so only the remaining steps run. If a different deployment workflow already exists, replace or remove it before running `deploy setup` again.

### `deploy workflow`

`deploy workflow` applies `publication.schedule` to `.github/workflows/publish.yml`.

```sh
npm exec riebeckite deploy workflow
```

It creates the workflow when it is missing. When it exists, only the `schedule` trigger changes; the rest of the file, including an external content checkout, is preserved. A workflow that does not look like a Riebeckite workflow is left untouched. `--check` exits non-zero when the workflow differs, without writing.

### `deploy domain`

`deploy domain` configures a Cloudflare Workers Custom Domain for the Worker used by `publish run`.

```sh
npm exec riebeckite deploy domain
```

Run it after the first publish run, because it reads the existing Wrangler configuration (`wrangler.jsonc` or `wrangler.json`) in the site and adds a declarative `routes` entry with `custom_domain: true`. It takes no arguments: the command prompts for a hostname such as `docs.example.com`, shows the planned change, and asks for confirmation before writing. A `wrangler.toml` is left unchanged, and the command stops with a hint when no Wrangler configuration exists or the terminal is not interactive. After writing, it offers `Deploy now?` and otherwise prints the `npm exec -- riebeckite publish run --execute` command. Running it again detects an already-configured domain and skips the write.
