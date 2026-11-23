# Troubleshooting guide

Diagnose from evidence. Do not change configuration or content until the failing stage is identified.

## Capture the failure

Record:

- Exact command and arguments.
- Full error output, including the first error.
- Working directory and project root.
- Riebeckite, Node.js, and package-manager versions.
- Recent changes and whether the failure is local, CI-only, or deployed.

A later error is often a consequence of the first. Fix or explain the first one.

## Verification order

1. `npm run check` — configuration, Plugin contracts, and content validation.
2. `npm run doctor` — content-source discovery, unreadable or invalid files, environment, and build state.
3. `npm exec riebeckite inspect config` — resolved content directory and project values.
4. `npm exec riebeckite inspect content --list` — logical content paths before WikiLink or embed diagnosis.
5. `npm run build` — routes, rendering, assets, and output.
6. `npm run build -- --full` — bypass incremental reuse when a stale result is suspected.

Use `npm exec riebeckite doctor --fail-on warning` when a deprecation warning should fail CI.

## Failure classes

| Symptom | Inspect first |
| --- | --- |
| Config file not found | Working directory, config filename, `requiresProject` command context. |
| Content file missing | `content.directory`, excludes, file extension, case, and symlinks. |
| Frontmatter rejected | Field type, unknown value, content format, Plugin options. |
| WikiLink or embed unresolved | `inspect content --list`, aliases, locale, and the resolved target. |
| Plugin check fails | Package contract, peer dependency, option shape, and supported version. |
| Build fails after check passes | Route/render boundary, asset import, client/server code, or environment. |
| Works locally, fails in CI | External content checkout, lockfile, environment variables, Node version. |
| Deployed asset 404 | `baseUrl`, base path, output directory, or cache. |
| Stale output | Incremental cache, content-source changes, or an incorrect Plugin cache mode. |

## Root-cause rules

- Fix the shared cause once, not every occurrence.
- Do not delete content or disable a check to make the error disappear.
- Do not weaken validation or catch an error without reporting it.
- If a dependency is the cause, verify the supported version before changing project code.
- If the failure is environmental, document the required variable or tool rather than hard-coding a local path.
- Keep the fix scoped; unrelated cleanup makes the diagnosis harder to trust.

## Report

State the failing stage, root cause, evidence, files changed, commands run, verification result, and any unresolved risk or follow-up.
