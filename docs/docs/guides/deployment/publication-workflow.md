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
- `publicationFingerprint` — a hash of routable entries, public redirects, and generated outputs (including derived views)
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

Approval is opt-in. The default is a single publication model with no approval step:

```ts
export default defineConfig({
  site: { title: "My notes" },
});
```

The planning, artifact, and durable-state checks always run. To add approval on top of that single model:

```ts
publication: {
  requireApproval: true,
  approvalFile: "publication/approvals.json", // optional
},
```

The shared gate (`riebeckite publish gate`) runs in the publish workflow, `publish run`, and the Cloudflare setup helpers. A direct `wrangler` call is outside Riebeckite's control, so protect the workflow files and repository settings as well.

For review, use `requireApproval: true` in the configuration, `workflow: "approved"` in the Core API, or `--require-approval` on the CLI:

```sh
riebeckite publish approve <slug> [--all] [--by "editor"]
riebeckite publish revoke <slug> [--all]
riebeckite publish plan --require-approval
```

Approvals are stored in `publication/approvals.json` at the project root. Each record binds a slug to the note's content fingerprint — slug, permalink, title, rendered HTML, and redirects. Editing the note invalidates the approval. A scheduled note does not need re-approval when its `publishAt` arrives, because the fingerprint excludes the scheduling fields.

Only a committed approval file on the branch that CI checks out is trusted. The CLI writes the file but never grants trust by itself, and the file contains no secret. A personal site can ignore the whole mechanism; a team can protect `publication/approvals.json` with branch protection or CODEOWNERS. `publish revoke` removes the records, and the next plan returns to `review`.

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
riebeckite publish revoke    <slug...> [--all]
riebeckite publish record    --provider <name> [--trigger <manual|scheduled|ci|cli>]
riebeckite publish gate      [--json] [--provider <name>]
```

`plan` and `status` are read-only. `validate` exits non-zero when the plan has an error or when the build artifact does not match the plan. `run` is a dry run unless `--execute` is present.

```sh
# Inspect without touching the network
npm exec -- riebeckite publish plan --json

# Confirm that dist/ is the artifact this plan describes
npm exec -- riebeckite publish validate

# Build and deploy explicitly
npm exec -- riebeckite publish run --execute --provider cloudflare-workers

# CI: scheduled trigger
npm exec -- riebeckite publish run --execute --trigger scheduled
```

`run --execute` builds only when the plan needs it. It writes `publication` metadata into `.riebeckite/build-output.json` and refuses to deploy an artifact whose publication fingerprint differs from the current plan. If another live run holds `.riebeckite/publication/lock.json`, the command stops; a lock whose process is gone or that is older than an hour is replaced. `--force` allows a deploy when the plan reports no changes.

`record` is for a deployment performed by an external CI action. It validates the built artifact against the current plan, then writes a successful run and snapshot to the durable state and history without deploying. Use it after `wrangler-action` or `actions/deploy-pages`.

`gate` is the single pre-deploy check. It always verifies the plan and build artifact; when `requireApproval` is enabled it also fails until the current content is approved. `publish validate` follows the same rule.

`riebeckite deploy` no longer executes a deployment. Use `riebeckite publish run --execute`. The `deploy setup` and `deploy domain` commands remain Cloudflare configuration helpers.

## Hosting adapters

| Provider | Redirects | Scheduler | Deploy path |
| --- | --- | --- | --- |
| `github-pages` | static stubs | CI best effort | `actions/deploy-pages` in the publish workflow |
| `cloudflare-workers` | native | none | `wrangler deploy` |
| `cloudflare-pages` | native | none | `wrangler pages deploy` |
| `netlify` | native | none | `netlify deploy --prod` |
| `vercel` | native | none | `vercel deploy --prod` |

Provider detection checks `wrangler.jsonc|json|toml`, `.github/workflows` for Pages actions, `vercel.json`, and `netlify.toml`. `--provider` overrides detection. Required environment variable **names** are reported by `publish status --json`; values are never read, recorded, or written by Riebeckite.

For GitHub Pages, the build must include the deploy plugin's `.nojekyll` and `404.html`; `publish validate` warns when they are missing. The adapter does not upload from Core and the CLI does not dispatch an unverified workflow. The publish workflow runs `publish gate --provider github-pages`, deploys with `actions/deploy-pages`, and then calls `publish record --provider github-pages`.

## CI

`.github/workflows/publish.yml` is the single production deploy path:

- `push` to `main`, `schedule`, and `workflow_dispatch` all enter the same workflow.
- The `riebeckite-production` concurrency group allows one deploy at a time and never cancels an in-flight deployment.
- The workflow fetches the branch head and stops when the checked-out commit is older, so a queued run cannot overwrite a newer deployment with stale content.
- `publish plan --json` decides whether a scheduled run needs a build and deploy. A push always builds because application code may have changed.
- The plan is uploaded as an artifact, then `publish validate` and `publish gate` check the built output.
- Actual uploads use the host's action (`cloudflare/wrangler-action` here). `publish record` writes the successful snapshot, and the workflow commits `publication/state.json` with `[skip ci]`. The next run reads that committed state, not the cache.
- The same shape works with `actions/upload-pages-artifact` and `actions/deploy-pages` for GitHub Pages.

A site that does not use scheduled publication still runs the schedule in this reference workflow, but the plan reports no changes and the workflow skips build and deploy. Remove the `schedule` trigger from generated sites that do not use `publishAt` if the periodic check itself is unwanted.

The state commit requires `contents: write` and a branch that the workflow may push to. If branch protection forbids the push, the deployment still happens, the job reports the failure, and the next run safely redeploys because the durable snapshot was not updated. Without any durable snapshot a runner treats every note as newly added; that is a full redeploy, never a skipped publication.

A scheduled job is delayed by runner availability and GitHub's queue. The workflow is idempotent: a late run computes the current state instead of replaying the missed schedule. If a re-run checks out an older commit, its build marker is older than the committed state and `record` refuses to overwrite the newer snapshot.

## History and diagnostics

The durable publication state is `publication/state.json` at the project root. It contains only the last successful snapshot: run id, publication fingerprint, routable slugs, fingerprints, redirects, artifact fingerprint, and provider. Commit it with the site. It has no content bodies or credentials and is the authoritative record for change detection.

`.riebeckite/publication/history.json` is the diagnostic history:

- run id, trigger, dry-run flag, and action
- plan and artifact fingerprints
- provider and workflow state
- build and deploy status, duration, and failure message
- change summary and next scheduled publication
- the last successful snapshot

History is bounded to 50 runs and contains no environment values or tokens. It is local build state and is not committed. The GitHub Actions cache restores it to make diagnostics continuous, but it is never the only source of truth: losing or truncating the cache causes a full redeploy, not a wrong publication. A malformed history is ignored with a warning.

## Lock and clean

`.riebeckite/publication/lock.json` is created with exclusive creation, so two local runs cannot both acquire it. The lock records the process id and hostname. A lock whose process is alive on this host is never removed by elapsed time or `--force`; a lock whose process is gone (or whose host no longer owns the local state) is recovered. `clean --all` and `clean --state` refuse to run while a live publication lock exists. Cleaning removes only `.riebeckite`, not the durable state or approvals, so publication history and trust survive a clean build.

## Build output marker

Every SSG build writes `.riebeckite/build-output.json` next to the build state. It records the output directory, the publication fingerprint, and the completion time. The CLI build additionally records an artifact hash. The marker is internal state, never written into `dist/`, and contains no credentials.

Before deploying, Riebeckite requires a marker whose publication fingerprint matches the current plan. If the CLI build recorded an artifact hash, the files in `dist/` must match it too. Missing, malformed, or copied markers from an older plan fail closed. `publish validate` and `publish record` use the marker completion time, so a few seconds of clock drift between plan and build does not cause a false mismatch.

`publish status --json` combines the current plan, the artifact state, provider capabilities, required environment variable names, approval file path, durable state, and history. It works without network access; only an actual deployment needs credentials.

## Verification notes

Local plan, approval, artifact, adapter, and history checks run in the package test suites. Real uploads to Cloudflare Workers, Cloudflare Pages, GitHub Pages, Netlify, and Vercel require credentials that are not available in this repository's tests; those paths are **UNVERIFIED** in automated tests. Run `publish run --execute` once per provider in a trusted environment before relying on the workflow.

## What this does not do

- It does not embed hosting credentials in Core, the manifest, or the static output.
- It does not add a database, server, or scheduler inside Core.
- It does not introduce a second visibility rule; existing frontmatter and `PublishStrategy` remain authoritative.
- It does not change sites that never use `publish`.
