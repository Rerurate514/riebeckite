---
name: riebeckite-upgrade
description: Use when upgrading Riebeckite packages or applying framework migrations.
riebeckiteVersion: "{{riebeckite-version}}"
---

# Upgrade workflow

Read `references/guide.md` and complete `assets/checklist.md`.

1. Inspect dependencies, lockfile, local extensions, Themes, generated Skills, and current CLI version. Define a target version before editing dependencies.
2. Use `npm exec riebeckite upgrade --to <version>`; do not hand-edit related dependency versions or the lockfile.
3. Read migration output before changing configuration or content. Keep dependency updates separate from migrations and feature work.
4. If `riebeckiteVersion` differs, ask whether to review each Skill, reset all outdated Skills, or skip. Run `npm exec riebeckite skills sync` only after the user chooses.
5. Run `npm run check` and `npm run build`; verify local Plugins and Themes against their public contracts.
6. Report version changes, migrations, validation, deferred work, compatibility risks, and a rollback route.
