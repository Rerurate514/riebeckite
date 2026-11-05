---
date: 2026-10-31
title: Publication Workflow
---
# Publication Workflow

The Publication Workflow adds planning, scheduled publication, pre-publish validation, approvals, and deploy diagnostics on top of the existing [[build-system|static build]]. It keeps the simple `push → build → deploy` path working: a site that never runs `riebeckite publish` behaves exactly as before.

The system has four parts:

1. **Publication Planner** — a Core API that turns the resolved [[glossary/manifest|content manifest]] into a plan.
2. **Workflow** — [[glossary/draft|draft]], review, approved, published, and retracted states. Approvals are optional.
3. **Hosting adapters** — deployment commands and capabilities for [[guides/deployment/cloudflare-workers|Cloudflare Workers]], Cloudflare Pages, GitHub Pages, Netlify, and Vercel.
4. **Diagnostics** — local validation, artifact [[glossary/fingerprint|fingerprints]], and a publication history.

Riebeckite Core never calls GitHub or Cloudflare. Adapters and history live in the [[reference/cli|CLI]], and credentials stay in the environment of the command that deploys.

## Planning is not a second publication decision

The planner reads `ContentManifestEntry.publishing`, which is produced by the existing `resolvePublishingState` function. [[glossary/draft|Draft]], scheduled, [[glossary/unlisted|unlisted]], and public notes are therefore decided once, by the build, and the planner only observes the result. It also reads `manifest.publicRedirects`, so redirect targets that are not public never enter a plan or a deploy artifact.

| [[glossary/visibility|Visibility]] | [[glossary/routable|Routable]] | [[glossary/discoverable|Discoverable]] | Planner bucket |
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
- `publicationFingerprint` — a hash of routable entries, public redirects, and [[glossary/generated-output|generated outputs]] (including [[derived-data|derived views]])
- `workflow` and `approvals.pending`
- `validation.issues`
- `action` — `none`, `build-and-deploy`, or `blocked`
- `build` and `deploy` booleans, with `reasons`

`createPublicationSnapshot(plan, { runId })` creates the record that the next run compares against. A snapshot contains only routable entries, their fingerprints, and redirects; it contains no content body and no credentials.

## Scheduled publication

A scheduled note is built as not-routable before `publishAt`. When the time passes, the next build resolves it as public. The planner sees a fingerprint change and plans a build and deploy, so a scheduled publication with no content edit still reaches the site. The existing [[glossary/build-state|build state]] already records `nextPublishingChangeAt` and stops [[glossary/output-cache|reusing output]] when that time has passed.

Scheduling is best effort where Riebeckite does not own the scheduler:

| Host | Scheduler | Meaning |
| --- | --- | --- |
| GitHub Pages | `ci-best-effort` | A [[guides/deployment/github-actions|GitHub Actions]] schedule triggers the build; GitHub may delay it. |
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

Approvals are stored in `publication/approvals.json` at the project root. Each record binds a [[glossary/slug|slug]] to the note's content fingerprint — slug, [[glossary/permalink|permalink]], title, rendered HTML, and redirects. Editing the note invalidates the approval. A scheduled note does not need re-approval when its `publishAt` arrives, because the fingerprint excludes the scheduling fields.

Only a committed approval file on the branch that CI checks out is trusted. The CLI writes the file but never grants trust by itself, and the file contains no secret. A personal site can ignore the whole mechanism; a team can protect `publication/approvals.json` with branch protection or CODEOWNERS. `publish revoke` removes the records, and the next plan returns to `review`.

Approval state and site state are deliberately separate:

- `review` — content needs approval; nothing is deployed.
- `approved` — approval exists but the new plan has not been deployed.
- `published` — the last successful snapshot matches the current plan.
- `retracted` — a previously public note is no longer routable; the next deploy removes it.

Retraction and republication use the existing [[glossary/visibility|visibility]] rules: set `visibility: draft` (or remove `publish: true`) and deploy to retract; make it public again and deploy to republish. The planner reports the removed or added entry.

## CLI

```text
riebeckite publish plan      [--json] [--at <iso>] [--provider <name>] [--approvals <path>] [--state-file <path>] [--require-approval]
riebeckite publish status    [--json] [--state-file <path>] ...
riebeckite publish validate  [--json] [--state-file <path>] ...
riebeckite publish run       [--execute] [--force] [--trigger <manual|scheduled|ci|cli>] [--state-file <path>] ...
riebeckite publish approve   <slug...> [--all] [--by <name>]
riebeckite publish revoke    <slug...> [--all]
riebeckite publish record    --provider <name> [--state-file <path>]
riebeckite publish gate      [--json] [--provider <name>] [--state-file <path>]
```

`plan` and `status` are read-only. `validate` exits non-zero when the plan has an error or when the build artifact does not match the plan. `run` is a dry run unless `--execute` is present.

`--state-file <path>`, or the `RIEBECKITE_PUBLICATION_STATE` environment variable, overrides `publication/state.json`. This is for a site that keeps its durable state outside the checked-out tree. A missing file at an explicit path is a cold start; malformed state at an explicit path is an error, not a silent reset.

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

`riebeckite deploy setup` and `deploy workflow` only prepare Cloudflare configuration and do not deploy. `deploy domain` adds a Custom Domain and then asks whether to run `wrangler deploy`; choose No to configure without deploying. Use `riebeckite publish run --execute` for the normal publication flow.

## Hosting adapters

| Provider | Redirects | Scheduler | Deploy path |
| --- | --- | --- | --- |
| `github-pages` | static stubs | CI best effort | `actions/deploy-pages` in the publish workflow |
| `cloudflare-workers` | native | none | `wrangler deploy` |
| `cloudflare-pages` | native | none | `wrangler pages deploy` |
| `netlify` | native | none | `netlify deploy --prod` |
| `vercel` | native | none | `vercel deploy --prod` |

Provider detection checks `wrangler.jsonc|json|toml`, `.github/workflows` for Pages actions, `vercel.json`, and `netlify.toml`. `--provider` overrides detection. Required environment variable **names** are reported by `publish status --json`; values are never read, recorded, or written by Riebeckite.

For GitHub Pages, the build must include the [[plugins/deploy|deploy plugin]]'s `.nojekyll` and `404.html`; `publish validate` warns when they are missing. The adapter does not upload from Core and the CLI does not dispatch an unverified workflow. The publish workflow runs `publish gate`, deploys with `actions/deploy-pages`, and then calls `publish record`; the provider is detected from the workflow and hosting files.

## CI

`.github/workflows/publish.yml` is the single production deploy path:

- `push` to `main` and `workflow_dispatch` enter the same workflow. Add `publication.schedule` to run it for `publishAt`.
- The `riebeckite-production` concurrency group allows one deploy at a time and never cancels an in-flight deployment.
- The workflow fetches the branch head and stops when the checked-out commit is older, so a queued run cannot overwrite a newer deployment with stale content.
- The generated workflow checks configuration, builds, and then runs `publish validate` and `publish gate` against the built output. It does not run a separate `publish plan` step or upload a plan artifact; a push always builds because application code may have changed, and scheduled or manual runs use the same workflow.
- Actual uploads use the host's action (`cloudflare/wrangler-action` here). `publish record` writes the successful snapshot to `RIEBECKITE_PUBLICATION_STATE` outside the worktree, and the workflow stores it on the `publication-state` branch with Git plumbing. The source branch is never committed to or pushed.
- The same shape works with `actions/upload-pages-artifact` and `actions/deploy-pages` for GitHub Pages.

Scheduled publication is opt-in. Enable it in `riebeckite.config.ts`:

```ts
publication: {
  schedule: { enabled: true, intervalMinutes: 30 },
}
```

Then apply the trigger with `npm exec riebeckite deploy workflow`. `intervalMinutes` caps the gap between runs and is an integer from 5 to 59; runs align to the hour. `deploy workflow --check` reports drift without writing. Without a schedule, a scheduled note is published by the next push or manual run.

Publication state lives on a dedicated `publication-state` branch with its own history. The workflow restores it into the runner's temporary directory before planning and pushes one new commit after a successful deploy. It needs `contents: write`, and nothing beyond the standard `GITHUB_TOKEN`. If the branch moves during the run, the workflow fails instead of overwriting the newer state; the site is already deployed, and rerunning records the current state. If the branch does not exist, the run starts from `publication/state.json` when that legacy file is still committed, otherwise from scratch. A corrupt state file fails the run instead of silently redeploying everything.

### Moving existing state off the source branch

Older Riebeckite releases committed `publication/state.json` to the source branch. To migrate:

1. Update `.github/workflows/publish.yml` from the current template and keep the existing `publication/state.json` committed for one run.
2. Push, or run the workflow manually. It reads the legacy file and creates the `publication-state` branch.
3. Delete `publication/state.json` from the repository in a normal commit and keep it in `.gitignore`. The workflow never recreates it on a development branch.
4. Do not merge `publication-state` into a development branch. It is operational state with an independent history.

If the legacy file is deleted before the first run, that run performs one full redeploy. Nothing is lost, and the next successful run initializes the branch. Never force-push the branch to recover it: delete it only when you accept a full redeploy, or restore it from its own history.

A scheduled job is delayed by runner availability and GitHub's queue. The workflow is idempotent: a late run computes the current state instead of replaying the missed schedule. If a re-run checks out an older commit, its build marker is older than the committed state and `record` refuses to overwrite the newer snapshot.

## History and diagnostics

The durable publication state is the `state.json` file on the `publication-state` branch. CI restores it through `RIEBECKITE_PUBLICATION_STATE` and never writes it into the checked-out source tree. The local CLI uses `publication/state.json` at the project root by default; that file is ignored by Git, because the branch is the CI authority. `--state-file <path>` selects another location, and an explicitly selected file fails closed when it is malformed. The snapshot contains only the last successful snapshot: run id, publication fingerprint, routable slugs, fingerprints, redirects, artifact fingerprint, and provider. It has no content bodies or credentials and is the authoritative record for change detection.

`.riebeckite/publication/history.json` is the diagnostic history:

- run id, trigger, dry-run flag, and action
- plan and artifact fingerprints
- provider and workflow state
- build and deploy status, duration, and failure message
- change summary and next scheduled publication
- the last successful snapshot

History is bounded to 50 runs and contains no environment values or tokens. It is local build state and is not committed. The generated workflow cache does not include it, so CI diagnostics start empty; publication decisions still use the durable state on the `publication-state` branch. A malformed history is ignored with a warning.

## Lock and clean

`.riebeckite/publication/lock.json` is created with exclusive creation, so two local runs cannot both acquire it. The lock records the process id, hostname, and a heartbeat. A same-host lock is live only while its process exists and its heartbeat is fresh; a lock older than one hour is recovered even if the process id is still alive. `--force` never removes a live lock. `clean` and `clean --all` refuse to run while a live publication lock exists. Cleaning removes `.riebeckite`, including the diagnostic history, but not the durable state or approvals stored outside it, so publication trust survives a clean build.

## Build output marker

Every [[glossary/ssg|SSG]] build writes `.riebeckite/build-output.json` next to the build state. It records the output directory, the publication fingerprint, and the completion time. The CLI build additionally records an artifact hash. The marker is internal state, never written into `dist/`, and contains no credentials.

Before deploying, Riebeckite requires a marker whose publication fingerprint matches the current plan. If the CLI build recorded an artifact hash, the files in `dist/` must match it too. Missing, malformed, or copied markers from an older plan fail closed. `publish validate` and `publish record` use the marker completion time, so a few seconds of clock drift between plan and build does not cause a false mismatch.

`publish status --json` combines the current plan, the artifact state, provider capabilities, required environment variable names, approval file path, durable state, and history. It works without network access; only an actual deployment needs credentials.

## Security and trust

- Core and the planner never read, store, or write hosting credentials.
  `publish status` reports required environment variable names, not values.
- An approval is trusted only when `publication/approvals.json` is committed on
  the branch that CI checks out. A local file grants nothing by itself.
- Approval records contain no secret. They bind a slug to the current content
  fingerprint, so editing the note invalidates the approval.
- A deploy requires a build marker whose publication fingerprint matches the
  current plan, and the artifact files must match the recorded artifact hash when
  one exists. Missing or copied markers fail closed.
- The lock prevents two local runs from deploying at once. It does not coordinate
  with a direct `wrangler` call or another machine.
- Direct provider actions and manual `wrangler` runs are outside Riebeckite's
  control. Protect workflow files, repository settings, and provider credentials
  separately.

## Troubleshooting

- **`publish validate` fails with an artifact mismatch**: rebuild with the current
  plan. A copied `dist/` or an older build marker cannot be deployed.
- **`publish run --execute` says the durable state is newer**: the state file
  belongs to a newer deployment. Restore the latest `publication-state` branch in
  CI, or refresh the local state file, then rebuild before publishing.
- **Approval is required but `publish approve` does not help**: approvals bind to
  the current content fingerprint. Rebuild and approve the new content; editing a
  note invalidates its approval.
- **A scheduled note did not publish**: the planner is best effort. Run
  `publish plan` to confirm the `publishAt` time, then run `publish run --execute`
  or wait for the next scheduled job.
- **The gate passes locally but CI blocks**: CI checks the committed approval file
  and the current artifact. A local uncommitted approval file is not trusted.
- **A provider is not detected**: pass `--provider`, and confirm the hosting
  configuration file exists. Credentials are read only by the deploying command.

## Verification notes

Local plan, approval, artifact, adapter, and history checks run in the package test suites. Real uploads to Cloudflare Workers, Cloudflare Pages, GitHub Pages, Netlify, and Vercel require credentials that are not available in this repository's tests; those paths are **UNVERIFIED** in automated tests. Before relying on the workflow, run `publish run --execute` once per provider it deploys, and exercise the GitHub Pages workflow separately because `publish run` cannot deploy it.

## What this does not do

This section is the limitation list, not a roadmap.

- It does not embed hosting credentials in Core, the manifest, or the static output.
- It does not add a database, server, or scheduler inside Core.
- It does not introduce a second visibility rule; existing [[glossary/frontmatter|frontmatter]] and [[glossary/publish-strategy|PublishStrategy]] remain authoritative.
- It does not change sites that never use `publish`.
