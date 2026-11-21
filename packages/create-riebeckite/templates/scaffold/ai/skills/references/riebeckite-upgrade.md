# Upgrade reference

## Prepare

Inspect the installed package ranges, lockfile, local Plugins and Themes, generated Skills, and current CLI version. Choose the target version before changing dependencies. Keep the upgrade separate from feature work and unrelated cleanup.

## Upgrade flow

```sh
npm exec riebeckite upgrade --to <version>
npm run check
npm run build
```

Use the upgrade command rather than hand-editing related dependency versions or the lockfile. Read its migration output before changing configuration or content. Verify local extensions against their public contracts after the dependency update.

## Generated Skills

When `riebeckiteVersion` in a generated `SKILL.md` differs from the CLI version, ask the user whether to review individually, replace all supported Skills, or skip. Run `npm exec riebeckite skills sync` only after that choice. It can overwrite custom Skill edits.

## Report

Report the previous and target versions, migrations applied, validation results, deferred work, compatibility risks, and a rollback route.
