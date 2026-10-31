---
date: 2026-10-31
title: Publication Workflow
---
# Publication Workflow

The Publication Workflow adds planning, scheduled publication, pre-publish validation, approvals, and deploy diagnostics on top of the existing static build. It keeps the simple `push → build → deploy` path working: a site that never runs `riebeckite publish` behaves exactly as before.

The system has four parts:

1. **Publication Planner** — a Core API that turns the resolved content manifest into a plan.
2. **Workflow** — draft, review, approved, published, and retracted states. Approvals are optional.
3. **Hosting adapters** — deployment commands and capabilities for Cloudflare Workers, Cloudflare Pages, GitHub Pages, Netlify, and Vercel.
4. **Diagnostics** — local validation, artifact fingerprints, and a publication history.

Riebeckite Core never calls GitHub or Cloudflare. Adapters and history live in the CLI, and credentials stay in the environment of the command that deploys.

## Planning is not a second publication decision

The planner reads `ContentManifestEntry.publishing`, which is produced by the existing `resolvePublishingState` function. Draft, scheduled, unlisted, and public notes are therefore decided once, by the build, and the planner only observes the result. It also reads `manifest.publicRedirects`, so redirect targets that are not public never enter a plan or a deploy artifact.

| Visibility | Routable | Discoverable | Planner bucket |
| --- | ---: | ---: | --- |
| `public` | yes | yes | public |
| `unlisted` | yes | no | unlisted |
| `scheduled` | no (until `publishAt`) | no | scheduled |
| `draft` | no | no | draft |

`publishAt` is inclusive. A note with `publishAt: 2026-01-10T09:00:00+09:00` is public from `2026-01-10T00:00:00.000Z`; the offset is honored, not the machine's local time.

## Core API

```ts
import {
  createPublicationPlan,
  publicationEntriesFromManifest,
  publicationRedirectsFromManifest,
} from "@riebeckite/core";

const plan = createPublicationPlan({
  buildTime: new Date(),
  entries: publicationEntriesFromManifest(manifest),
  redirects: publicationRedirectsFromManifest(manifest),
  previous: lastSuccessfulSnapshot,
  workflow: "direct", // or "approved"
});
```

The plan is JSON-serializable and contains:

- `targets.public`, `targets.unlisted`, `targets.scheduled`, `targets.drafts`
- `nextPublicationAt` — the earliest future `publishAt`
- `changes` — added, changed, removed, unchanged, and `detected`
- `publicationFingerprint` — a hash of routable entries plus public redirects
- `workflow` and `approvals.pending`
- `validation.issues`
- `action` — `none`, `build-and-deploy`, or `blocked`
- `build` and `deploy` booleans, with `reasons`

`createPublicationSnapshot(plan, { runId })` creates the record that the next run compares against. A snapshot contains only routable entries, their fingerprints, and redirects; it contains no content body and no credentials.

## Scheduled publication

A scheduled note is built as not-routable before `publishAt`. When the time passes, the next build resolves it as public. The planner sees a fingerprint change and plans a build and deploy, so a scheduled publication with no content edit still reaches the site. The existing build state already records `nextPublishingChangeAt` and stops reusing output when that time has passed.

Scheduling is best effort where Riebeckite does not own the scheduler:

| Host | Scheduler | Meaning |
| --- | --- | --- |
| GitHub Pages | `ci-best-effort` | A GitHub Actions schedule triggers the build; GitHub may delay it. |
| Cloudflare Workers / Pages | `none` | Run `publish run` from CI or manually. |
| Netlify / Vercel | `none` | Same as Cloudflare. |

A delayed run never publishes stale content: the plan is recomputed at run time. A missed run is recovered by the next successful run.

## Approval workflow

Approval is opt-in. Personal sites use `workflow: "direct"` and need no extra file.

For review, use `workflow: "approved"`:

```sh
riebeckite publish approve <slug> [--all] [--by "editor"]
riebeckite publish plan --require-approval
```

Approvals are stored in `publication/approvals.json` at the project root. Each record binds a slug to the note's content fingerprint — slug, permalink, title, rendered HTML, and redirects. Editing the note invalidates the approval. A scheduled note does not need re-approval when its `publishAt` arrives, because the fingerprint excludes the scheduling fields.

Only a committed approval file on the branch that CI checks out is trusted. The CLI writes the file but never grants trust by itself, and the file contains no secret. A personal site can ignore the whole mechanism; a team can protect `publication/approvals.json` with branch protection or CODEOWNERS.

Approval state and site state are deliberately separate:

- `review` — content needs approval; nothing is deployed.
- `approved` — approval exists but the new plan has not been deployed.
- `published` — the last successful snapshot matches the current plan.
- `retracted` — a previously public note is no longer routable; the next deploy removes it.

Retraction and republication use the existing visibility rules: set `visibility: draft` (or remove `publish: true`) and deploy to retract; make it public again and deploy to republish. The planner reports the removed or added entry.

## CLI

```text
riebeckite publish plan      [--json] [--at <iso>] [--provider <name>] [--approvals <path>] [--require-approval]
riebeckite publish status    [--json] ...
riebeckite publish validate  [--json] ...
riebeckite publish run       [--execute] [--force] [--trigger <manual|scheduled|ci|cli>] ...
riebeckite publish approve   <slug...> [--all] [--by <name>]
riebeckite publish record    --provider <name> [--trigger <manual|scheduled|ci|cli>]
```

`plan` and `status` are read-only. `validate` exits non-zero when the plan has an error or when the build artifact does not match the plan. `run` is a dry run unless `--execute` is present.

```sh
# Inspect without touching the network
npm exec riebeckite publish plan --json

# Confirm that dist/ is the artifact this plan describes
npm exec riebeckite publish validate

# Build and deploy explicitly
npm exec riebeckite publish run --execute --provider cloudflare-workers

# CI: scheduled trigger
npm exec riebeckite publish run --execute --trigger scheduled
```

`run --execute` builds only when the plan needs it. It writes `publication` metadata into `.riebeckite/build-output.json` and refuses to deploy an artifact whose publication fingerprint differs from the current plan. If another live run holds `.riebeckite/publication/lock.json`, the command stops; a lock whose process is gone or that is older than an hour is replaced. `--force` allows a deploy when the plan reports no changes.

`record` is for a deployment performed by an external CI action. It validates the built artifact against the current plan, then writes a successful run and snapshot to the history without deploying. Use it after `wrangler-action` or `actions/deploy-pages` so the next run can detect that nothing changed.

The old `riebeckite deploy` command is unchanged. `publish run` uses it for Cloudflare Workers.

## Hosting adapters

| Provider | Redirects | Scheduler | Deploy path |
| --- | --- | --- | --- |
| `github-pages` | static stubs | CI best effort | `gh workflow run` or the current GitHub Actions job |
| `cloudflare-workers` | native | none | `wrangler deploy` |
| `cloudflare-pages` | native | none | `wrangler pages deploy` |
| `netlify` | native | none | `netlify deploy --prod` |
| `vercel` | native | none | `vercel deploy --prod` |

Provider detection checks `wrangler.jsonc|json|toml`, `.github/workflows` for Pages actions, `vercel.json`, and `netlify.toml`. `--provider` overrides detection. Required environment variable **names** are reported by `publish status --json`; values are never read, recorded, or written by Riebeckite.

For GitHub Pages, the build must include the deploy plugin's `.nojekyll` and `404.html`; `publish validate` warns when they are missing. The adapter does not upload from Core. A GitHub Actions job deploys the artifact with `actions/deploy-pages` and then calls `publish record --provider github-pages`. Outside CI, `publish run --execute --provider github-pages` dispatches the deploy workflow with `gh workflow run`; because dispatch does not prove the deployment succeeded, it does not record the successful snapshot. Run `publish record` after the workflow completes.

## CI

`.github/workflows/publish.yml` in this repository is a working reference:

- `schedule` runs every 15 minutes and `workflow_dispatch` allows a manual run.
- The `riebeckite-publish` concurrency group allows one run at a time; a queued run starts after the current one instead of cancelling it.
- `publish plan --json` decides whether a build and deploy are needed. A run with no changes performs neither.
- The plan is uploaded as an artifact, then `publish validate` checks the built output.
- Actual uploads use the host's action (`cloudflare/wrangler-action` here). `publish record` then writes the successful snapshot, and the workflow cache carries it to the next run. Without that snapshot a fresh runner would treat every note as newly added.
- The same shape works with `actions/upload-pages-artifact` and `actions/deploy-pages` for GitHub Pages.

A scheduled job is delayed by runner availability and GitHub's queue. The workflow is idempotent: a late run computes the current state instead of replaying the missed schedule. Failed stages leave the previous successful snapshot in place, so the next run retries the same plan.

## History and diagnostics

Publication history is written to `.riebeckite/publication/history.json`:

- run id, trigger, dry-run flag, and action
- plan and artifact fingerprints
- provider and workflow state
- build and deploy status, duration, and failure message
- change summary and next scheduled publication
- the last successful snapshot

History is bounded to 50 runs and contains no environment values or tokens. It is local build state and is not committed. Upload it as a CI artifact if you want a long-term record.

`publish status --json` combines the current plan, the artifact state, provider capabilities, required environment variable names, approval file path, and history. It works without network access; only an actual deployment needs credentials.

## Verification notes

Local plan, approval, artifact, adapter, and history checks run in the package test suites. Real uploads to Cloudflare Workers, Cloudflare Pages, GitHub Pages, Netlify, and Vercel require credentials that are not available in this repository's tests; those paths are **UNVERIFIED** in automated tests. Run `publish run --execute` once per provider in a trusted environment before relying on the workflow.

## What this does not do

- It does not embed hosting credentials in Core, the manifest, or the static output.
- It does not add a database, server, or scheduler inside Core.
- It does not introduce a second visibility rule; existing frontmatter and `PublishStrategy` remain authoritative.
- It does not change sites that never use `publish`.
