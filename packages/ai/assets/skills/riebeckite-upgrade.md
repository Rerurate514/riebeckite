---
name: riebeckite-upgrade
description: Use when upgrading Riebeckite packages or reconciling a project with a newer release.
riebeckiteVersion: "{{riebeckite-version}}"
---

# Riebeckite upgrade workflow

Read `references/guide.md` and complete `assets/checklist.md`.

1. Inspect `package.json`, the lockfile, local extensions, Plugins, Theme, and generated Skills. Record the current `@riebeckite/*` versions.
2. Read the release notes and migration guidance for every package being changed.
3. Run `npm exec riebeckite upgrade --to <version>` as a preflight. It checks isolated baseline and candidate copies and reports READY, BLOCKED, or UNVERIFIED; it does not install or modify the project.
4. Resolve the reported blockers before changing dependencies. Do not treat a preflight result as an upgrade.
5. Update all `@riebeckite/*` packages together with the project's package manager. Do not hand-edit the lockfile or update one package in isolation.
6. Apply required configuration, Plugin, Theme, or content migrations using the release guidance.
7. Run `npm run check`, `npm run doctor`, and `npm run build`.
8. Review generated Skills before syncing. Run `npm exec riebeckite skills sync` and accept replacement only when the user agrees; keep local guidance otherwise.
9. Inspect changed routes, assets, and publication behaviour against the pre-upgrade baseline.
10. Report old/new versions, preflight result, migrations, commands run, Skill decision, and rollback path.
