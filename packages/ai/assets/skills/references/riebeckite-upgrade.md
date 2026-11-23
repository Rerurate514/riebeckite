# Riebeckite upgrade guide

An upgrade is two separate steps: a preflight check, then a dependency and migration change. Do not confuse them.

## Preflight check

```sh
npm exec riebeckite upgrade --to <version>
```

This command creates an isolated, reproducible candidate and runs baseline and candidate checks in temporary copies. It reports:

- `READY` — the project can likely move to the candidate.
- `BLOCKED` — a dependency, peer, engine, typecheck, check, or build issue must be resolved.
- `UNVERIFIED` — the check could not establish a reliable result.

It does not install packages, edit `package.json`, or change the project. Treat its output as evidence for the next step.

## Inspect the project

Record:

- Every `@riebeckite/*` dependency and its current range.
- The lockfile and package manager.
- Local Plugins, Themes, content formats, and custom scripts.
- Generated Skills and any local edits.
- Deployment configuration and external content.
- Current `npm run check`, `npm run doctor`, and `npm run build` results.

Capture a baseline before changing versions so regressions are distinguishable from pre-existing failures.

## Upgrade sequence

1. Read release notes and migration guides for the target version.
2. Run `npm exec riebeckite upgrade --to <version>`.
3. Resolve blockers in the current project or adjust the target version.
4. Update all `@riebeckite/*` packages together with the project's package manager.
5. Let the package manager update the lockfile. Do not hand-edit it.
6. Apply required configuration, Plugin, Theme, or content migrations.
7. Run `npm run check`, `npm run doctor`, and `npm run build`.
8. Inspect representative routes, assets, feeds, redirects, and publication state.
9. Sync generated Skills only after review and user consent.

Before 1.0, minor releases may contain breaking changes. From 1.0, semantic versioning applies. Deprecated APIs may be reported by `check`, `doctor`, the Inspector, or lifecycle metadata.

## Generated Skills

`npm exec riebeckite skills sync` can add missing Skills, restore missing files, and replace outdated generated Skills. It can overwrite local edits to generated `SKILL.md` and reference files after confirmation.

- Review the shown diff first.
- Keep intentional local guidance instead of accepting a replacement.
- Do not sync Skills silently as part of an upgrade.

## Rollback

Record the previous dependency versions and lockfile revision before changing them. If check or build regresses, restore the previous dependency set and lockfile, then diagnose. Do not stack a second upgrade on an unverified one.

## Common failures

| Symptom | Likely cause |
| --- | --- |
| Preflight is BLOCKED | Peer dependency, engine, or build incompatibility in the candidate. |
| Preflight is UNVERIFIED | The environment could not install or run the isolated check. |
| Check fails after upgrade | Deprecated API, changed option shape, or Plugin contract change. |
| Build fails after check passes | Route, asset, or renderer migration not applied. |
| Site looks unchanged but output is stale | Old lockfile, partial dependency update, or cached build. |
| Skills changed unexpectedly | Sync replaced generated files or lost local edits. |

## Report

State old and new versions, preflight result, migrations applied, commands run, verification, Skill sync decision, and rollback path.
